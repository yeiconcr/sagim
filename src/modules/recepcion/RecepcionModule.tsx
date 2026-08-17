import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Dumbbell, Store, UserX, RefreshCw,
  Phone, MapPin, AlertTriangle,
  CheckCircle2, XCircle, Clock, User, ChevronRight, ShoppingCart,
  CreditCard, Ruler, Cake, History, LogIn, CalendarDays, AlertCircle, Banknote
} from "lucide-react";
import { cn, formatDate, formatCurrency, today, addDays, toISODate, daysBetween } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/appStore";
import { getDb } from "@/db/database";
import { getAsistenciasCliente } from "@/db/queries/asistencias";
import { useDebounce } from "@/hooks/useDebounce";

// =============================================
// TIPOS
// =============================================
interface ClienteRecepcion {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  ciudad: string | null;
  direccion: string | null;
  celular: string | null;
  telefono: string | null;
  sexo: string | null;
  estado: "A" | "I";
  fecha_nacimiento: string | null;
  foto_path: string | null;
  nombre_completo: string;
  proximo_vencimiento: string | null;
  actividad_vigente: string | null;
  dias_restantes: number | null;
  ultimos_pagos: UltimoPago[];
  total_gastado: number;
  es_cumpleanos_hoy: boolean;
  es_cumpleanos_semana: boolean;
  dias_para_cumple: number | null;
  ya_vino_hoy: boolean;
  ultima_visita: string | null;
  dias_sin_venir: number | null;
  visitas_mes: number;
  notas: NotaCliente[];
  deuda_pendiente: number;
}



interface UltimoPago { fecha: string; concepto: string; valor: number; }
interface NotaCliente { id: number; nota: string; tipo: "info" | "alerta" | "importante"; }
interface ClienteReciente { cedula: string; nombre: string; foto_path: string | null; }
interface ClienteBusqueda { inscripcion: number; cedula: string; nombres: string; apellidos: string; foto_path: string | null; estado: "A" | "I"; }

type EstadoVencimiento = "vigente" | "vence-hoy" | "vence-pronto" | "vencido" | "sin-pagos";

function calcularEstadoVencimiento(diasRestantes: number | null): EstadoVencimiento {
  if (diasRestantes === null) return "sin-pagos";
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes === 0) return "vence-hoy";
  if (diasRestantes <= 5) return "vence-pronto";
  return "vigente";
}

const ESTADO_VENC_CONFIG: Record<EstadoVencimiento, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  vigente: { label: "VIGENTE", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  "vence-hoy": { label: "VENCE HOY", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: AlertTriangle },
  "vence-pronto": { label: "VENCE PRONTO", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  vencido: { label: "VENCIDO", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  "sin-pagos": { label: "SIN PAGOS", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", icon: Clock },
};

const STORAGE_KEY_RECIENTES = "sagim_clientes_recientes";
const MAX_RECIENTES = 5;
const DEBOUNCE_MS = 400;



// =============================================
// QUERIES
// =============================================
async function buscarClientesCoincidentes(termino: string): Promise<ClienteBusqueda[]> {
  if (!termino.trim()) return [];
  const db = await getDb();
  const isNumeric = /^\d+$/.test(termino.trim());

  if (isNumeric) {
    return await db.select<ClienteBusqueda[]>(`
      SELECT inscripcion, cedula, nombres, apellidos, foto_path, estado
      FROM clientes WHERE cedula = $1 OR CAST(inscripcion AS TEXT) = $1 LIMIT 10
    `, [termino.trim()]);
  } else {
    return await db.select<ClienteBusqueda[]>(`
      SELECT inscripcion, cedula, nombres, apellidos, foto_path, estado
      FROM clientes WHERE nombres LIKE $1 OR apellidos LIKE $1 OR (nombres || ' ' || apellidos) LIKE $1
      ORDER BY nombres ASC LIMIT 10
    `, [`%${termino.trim()}%`]);
  }
}



async function cargarClienteCompleto(cedula: string): Promise<ClienteRecepcion | null> {
  const db = await getDb();
  const rows = await db.select<ClienteRecepcion[]>(`
    SELECT inscripcion, cedula, nombres, apellidos, ciudad, direccion, celular, telefono, sexo, estado, fecha_nacimiento, foto_path
    FROM clientes WHERE cedula = $1 LIMIT 1
  `, [cedula]);
  if (rows.length === 0) return null;
  const c = rows[0];

  // Vencimiento
  const pagos = await db.select<Array<{ fecha_pag: string; factor: number; nombre: string }>>(`
    SELECT p.fecha_pag, a.factor, a.nombre FROM pagos_cli p
    JOIN actividades a ON a.codigo = p.id_actividad
    WHERE p.inscripcion = $1 AND p.estado = 'A' AND p.periodicidad = 'M'
    ORDER BY p.fecha_pag DESC LIMIT 1
  `, [c.inscripcion]);

  let proximo_vencimiento: string | null = null, actividad_vigente: string | null = null, dias_restantes: number | null = null;
  if (pagos.length > 0) {
    const u = pagos[0];
    proximo_vencimiento = toISODate(addDays(u.fecha_pag, u.factor));
    actividad_vigente = u.nombre;
    dias_restantes = daysBetween(today(), proximo_vencimiento);
  }



  // Últimos pagos y total
  const ultimosPagosRaw = await db.select<Array<{ fecha_pag: string; nombre_actividad: string | null; valor: number }>>(`
    SELECT p.fecha_pag, a.nombre as nombre_actividad, p.valor FROM pagos_cli p
    LEFT JOIN actividades a ON a.codigo = p.id_actividad
    WHERE p.inscripcion = $1 AND p.estado = 'A' ORDER BY p.fecha_pag DESC LIMIT 5
  `, [c.inscripcion]);
  const ultimos_pagos = ultimosPagosRaw.map(p => ({ fecha: p.fecha_pag, concepto: p.nombre_actividad || "Pago", valor: p.valor }));
  const totalRow = await db.select<Array<{ total: number }>>(`SELECT COALESCE(SUM(valor), 0) as total FROM pagos_cli WHERE inscripcion = $1 AND estado = 'A'`, [c.inscripcion]);
  const total_gastado = totalRow[0]?.total || 0;

  // Cumpleaños
  let es_cumpleanos_hoy = false, es_cumpleanos_semana = false, dias_para_cumple: number | null = null;
  if (c.fecha_nacimiento) {
    const hoy = new Date(today()), nac = new Date(c.fecha_nacimiento);
    const cumple = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
    if (cumple < hoy) cumple.setFullYear(hoy.getFullYear() + 1);
    dias_para_cumple = Math.ceil((cumple.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    es_cumpleanos_hoy = dias_para_cumple === 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() === nac.getDate());
    es_cumpleanos_semana = dias_para_cumple <= 7 && dias_para_cumple > 0;
  }



  // Asistencia
  const hoyStr = today();
  const asistHoy = await db.select<Array<{ id: number }>>(`SELECT id FROM asistencias WHERE inscripcion = $1 AND fecha = $2 LIMIT 1`, [c.inscripcion, hoyStr]);
  const ya_vino_hoy = asistHoy.length > 0;
  const ultVisita = await db.select<Array<{ fecha: string }>>(`SELECT fecha FROM asistencias WHERE inscripcion = $1 ORDER BY fecha DESC, hora DESC LIMIT 1`, [c.inscripcion]);
  const ultima_visita = ultVisita.length > 0 ? ultVisita[0].fecha : null;
  const dias_sin_venir = ultima_visita ? daysBetween(ultima_visita, hoyStr) : null;
  const inicioMes = hoyStr.substring(0, 7) + "-01";
  const visitasMesRow = await db.select<Array<{ total: number }>>(`SELECT COUNT(*) as total FROM asistencias WHERE inscripcion = $1 AND fecha >= $2`, [c.inscripcion, inicioMes]);
  const visitas_mes = visitasMesRow[0]?.total || 0;

  // Notas
  const notasRaw = await db.select<Array<{ id: number; nota: string; tipo: string }>>(`SELECT id, nota, tipo FROM notas_cliente WHERE inscripcion = $1 AND activa = 1 ORDER BY id DESC`, [c.inscripcion]);
  const notas: NotaCliente[] = notasRaw.map(n => ({ id: n.id, nota: n.nota, tipo: (n.tipo as "info" | "alerta" | "importante") || "info" }));

  // Deuda
  const deudaRow = await db.select<Array<{ total: number }>>(`SELECT COALESCE(SUM(saldo_clien), 0) as total FROM ctas_por_cobrar WHERE id_cliente = $1 AND saldo_clien > 0`, [c.cedula]);
  const deuda_pendiente = deudaRow[0]?.total || 0;

  return { ...c, nombre_completo: `${c.nombres} ${c.apellidos}`, proximo_vencimiento, actividad_vigente, dias_restantes, ultimos_pagos, total_gastado, es_cumpleanos_hoy, es_cumpleanos_semana, dias_para_cumple, ya_vino_hoy, ultima_visita, dias_sin_venir, visitas_mes, notas, deuda_pendiente };
}



// =============================================
// COMPONENTE FICHA CLIENTE (diseño original compacto)
// =============================================
interface FichaClienteProps {
  cliente: ClienteRecepcion;
  onVentasGym: () => void;
  onVentasTienda: () => void;
  onVerPagos: () => void;
  onVerMedidas: () => void;
  onVerAsistencias: () => void;
  onOtro: () => void;
  onFotoActualizada: (nuevaFoto: string) => void;
  onRegistrarEntrada: () => void;
}

function FichaCliente({ cliente, onVentasGym, onVentasTienda, onVerPagos, onVerMedidas, onVerAsistencias, onOtro, onFotoActualizada, onRegistrarEntrada }: FichaClienteProps) {
  const [actualizandoFoto, setActualizandoFoto] = useState(false);
  const estadoVenc = calcularEstadoVencimiento(cliente.dias_restantes);
  const vencConfig = ESTADO_VENC_CONFIG[estadoVenc];
  const VencIcon = vencConfig.icon;
  const clienteInactivo = cliente.estado === "I";



  const handleCambiarFoto = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        setActualizandoFoto(true);
        const db = await getDb();
        await db.execute("UPDATE clientes SET foto_path = $1 WHERE inscripcion = $2", [file.name, cliente.inscripcion]);
        onFotoActualizada(file.name);
      } catch (err) { console.error("Error:", err); }
      finally { setActualizandoFoto(false); }
    };
    input.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Columna izquierda: foto + estado */}
      <div className="flex flex-col gap-3">
        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-slate-100 relative flex items-center justify-center cursor-pointer" onClick={handleCambiarFoto}>
            {cliente.foto_path ? (
              <img src={`/fotos/${cliente.foto_path}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300"><User className="w-12 h-12" /><span className="text-xs">Sin foto</span></div>
            )}
            {actualizandoFoto && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
            <div className={cn("absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold border", clienteInactivo ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200")}>
              {clienteInactivo ? "INACTIVO" : "ACTIVO"}
            </div>
            {cliente.es_cumpleanos_hoy && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-200 flex items-center gap-1"><Cake className="w-3 h-3" />¡Cumple!</div>}
          </div>
        </Card>



        {/* Estado vencimiento */}
        <Card className={cn("border", vencConfig.bg)}>
          <CardContent className="p-3">
            <div className={cn("flex items-center gap-2 mb-1", vencConfig.color)}><VencIcon className="w-4 h-4" /><span className="font-bold text-xs">{vencConfig.label}</span></div>
            {cliente.proximo_vencimiento ? (
              <>
                <p className="text-xs text-slate-500">Próximo vencimiento:</p>
                <p className={cn("text-sm font-semibold", vencConfig.color)}>{formatDate(cliente.proximo_vencimiento)}</p>
                {cliente.dias_restantes !== null && <p className="text-xs text-slate-400">{cliente.dias_restantes < 0 ? `Hace ${Math.abs(cliente.dias_restantes)} días` : cliente.dias_restantes === 0 ? "Hoy" : `En ${cliente.dias_restantes} días`}</p>}
                {cliente.actividad_vigente && <p className="text-xs text-slate-500 mt-1 italic truncate">{cliente.actividad_vigente}</p>}
              </>
            ) : (<p className="text-xs text-slate-400">Sin pagos registrados</p>)}
          </CardContent>
        </Card>

        {/* Asistencia compacta */}
        <Card className={cn("border", cliente.ya_vino_hoy ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200")}>
          <CardContent className="p-3">
            <div className={cn("flex items-center gap-2 mb-1", cliente.ya_vino_hoy ? "text-green-700" : "text-slate-600")}><LogIn className="w-4 h-4" /><span className="font-bold text-xs">{cliente.ya_vino_hoy ? "YA VINO HOY" : "ASISTENCIA"}</span></div>
            <p className="text-sm font-bold text-slate-800">{cliente.visitas_mes} <span className="text-xs font-normal text-slate-500">visitas este mes</span></p>
            {cliente.dias_sin_venir !== null && cliente.dias_sin_venir > 0 && !cliente.ya_vino_hoy && <p className="text-xs text-slate-400">Última visita hace {cliente.dias_sin_venir} días</p>}
          </CardContent>
        </Card>
      </div>



      {/* Columna derecha: datos + acciones */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 truncate">{cliente.nombre_completo}</h2>
                <p className="text-slate-500 text-sm">CC: {cliente.cedula} · #{cliente.inscripcion}</p>
              </div>
            </div>

            {/* Alertas compactas */}
            {(cliente.es_cumpleanos_semana || cliente.deuda_pendiente > 0 || cliente.notas.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {cliente.es_cumpleanos_semana && !cliente.es_cumpleanos_hoy && (
                  <div className="flex items-center gap-2 p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs"><Cake className="w-3 h-3" />Cumpleaños en {cliente.dias_para_cumple} días</div>
                )}
                {cliente.deuda_pendiente > 0 && (
                  <div className="flex items-center justify-between p-1.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs"><span className="flex items-center gap-1"><Banknote className="w-3 h-3" />Saldo pendiente</span><span className="font-bold">{formatCurrency(cliente.deuda_pendiente)}</span></div>
                )}
                {cliente.notas.slice(0, 2).map((n) => (
                  <div key={n.id} className={cn("flex items-center gap-1 p-1.5 rounded border text-xs", n.tipo === "importante" ? "bg-red-50 border-red-200 text-red-700" : n.tipo === "alerta" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-600")}>
                    {n.tipo === "importante" && <AlertCircle className="w-3 h-3" />}{n.tipo === "alerta" && <AlertTriangle className="w-3 h-3" />}{n.nota}
                  </div>
                ))}
              </div>
            )}



            {/* Contacto */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-sm">
              <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-slate-400" /><span>{cliente.celular || cliente.telefono || "—"}</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-slate-400" /><span>{cliente.ciudad || "—"}</span></div>
            </div>

            {/* Financiero */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
              <div><p className="text-xs text-slate-400">Total gastado</p><p className="text-base font-bold text-slate-800">{formatCurrency(cliente.total_gastado)}</p></div>
              <div><p className="text-xs text-slate-400">Último pago</p>{cliente.ultimos_pagos.length > 0 ? <p className="text-base font-bold text-slate-800">{formatCurrency(cliente.ultimos_pagos[0].valor)}</p> : <p className="text-sm text-slate-400">—</p>}</div>
            </div>
          </CardContent>
        </Card>

        {/* Registrar entrada */}
        {!cliente.ya_vino_hoy && (
          <Button onClick={onRegistrarEntrada} className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
            <LogIn className="w-4 h-4 mr-2" />Registrar Entrada
          </Button>
        )}

        {/* Botones de venta */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onVentasGym} disabled={clienteInactivo} className="h-10 border-primary text-primary hover:bg-primary/10 disabled:opacity-50 text-sm"><Dumbbell className="w-4 h-4 mr-2" />Ventas Gym</Button>
          <Button variant="outline" onClick={onVentasTienda} className="h-10 border-primary text-primary hover:bg-primary/10 text-sm"><ShoppingCart className="w-4 h-4 mr-2" />Ventas Tienda</Button>
        </div>

        {/* Botones secundarios */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={onVerPagos} className="text-xs"><CreditCard className="w-3 h-3 mr-1" />Pagos</Button>
          <Button variant="outline" size="sm" onClick={onVerMedidas} className="text-xs"><Ruler className="w-3 h-3 mr-1" />Medidas</Button>
          <Button variant="outline" size="sm" onClick={onVerAsistencias} className="text-xs"><CalendarDays className="w-3 h-3 mr-1" />Asistencias</Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onOtro} className="text-xs"><RefreshCw className="w-3 h-3 mr-1" />Buscar otro cliente</Button>
      </div>
    </div>
  );
}



// =============================================
// MÓDULO PRINCIPAL
// =============================================
export function RecepcionModule() {
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteRecepcion | null>(null);
  const [coincidencias, setCoincidencias] = useState<ClienteBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recientes, setRecientes] = useState<ClienteReciente[]>([]);
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(true);
  const [mostrarAsistencias, setMostrarAsistencias] = useState(false);
  const [historialAsistencias, setHistorialAsistencias] = useState<{ historial: Array<{ fecha: string; hora: string }>; visitasMes: number; visitasTotal: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setModulo, setClientePrecargado, clientePrecargado, navegarAClientePagos, navegarAClienteMedidas } = useAppStore();
  const debouncedBusqueda = useDebounce(busqueda, DEBOUNCE_MS);

  useEffect(() => { try { const stored = localStorage.getItem(STORAGE_KEY_RECIENTES); if (stored) setRecientes(JSON.parse(stored)); } catch { /* ignore */ } }, []);

  const agregarReciente = useCallback((c: ClienteRecepcion) => {
    setRecientes(prev => {
      const nuevo: ClienteReciente = { cedula: c.cedula, nombre: c.nombre_completo, foto_path: c.foto_path };
      const filtrado = prev.filter(r => r.cedula !== c.cedula);
      const updated = [nuevo, ...filtrado].slice(0, MAX_RECIENTES);
      localStorage.setItem(STORAGE_KEY_RECIENTES, JSON.stringify(updated));
      return updated;
    });
  }, []);



  useEffect(() => { if (clientePrecargado) { setBusqueda(clientePrecargado); handleSeleccionarCliente(clientePrecargado); setClientePrecargado(null); } }, []);
  useEffect(() => { if (!cliente && coincidencias.length === 0) setTimeout(() => inputRef.current?.focus(), 100); }, [cliente, coincidencias.length]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (cliente) handleOtro(); else if (coincidencias.length > 0) { setCoincidencias([]); inputRef.current?.focus(); } } };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cliente, coincidencias.length]);

  const handleBuscar = useCallback(async (termino = busqueda) => {
    if (!termino.trim()) return;
    setBuscando(true); setNoEncontrado(false); setError(null); setCoincidencias([]);
    try {
      const resultados = await buscarClientesCoincidentes(termino);
      if (resultados.length === 0) { setNoEncontrado(true); setTimeout(() => inputRef.current?.focus(), 100); }
      else if (resultados.length === 1) { await handleSeleccionarCliente(resultados[0].cedula); }
      else { setCoincidencias(resultados); }
    } catch (err) { console.error("[Recepción] Error:", err); setError("Error al consultar."); }
    finally { setBuscando(false); }
  }, [busqueda]);

  const handleSeleccionarCliente = useCallback(async (cedula: string) => {
    setBuscando(true); setCoincidencias([]);
    try {
      const resultado = await cargarClienteCompleto(cedula);
      if (resultado) { setCliente(resultado); agregarReciente(resultado); } else { setNoEncontrado(true); }
    } catch (err) { console.error("[Recepción] Error:", err); setError("Error al cargar."); }
    finally { setBuscando(false); }
  }, [agregarReciente]);

  useEffect(() => { if (autoSearchEnabled && debouncedBusqueda.trim().length >= 3 && !cliente) handleBuscar(debouncedBusqueda); }, [debouncedBusqueda, cliente, handleBuscar, autoSearchEnabled]);



  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleBuscar(); if (e.key === "Escape") { if (coincidencias.length > 0) setCoincidencias([]); else handleOtro(); } };
  const handleSeleccionarReciente = (cedula: string) => { setBusqueda(cedula); handleSeleccionarCliente(cedula); };
  const handleOtro = () => { setAutoSearchEnabled(false); setCliente(null); setCoincidencias([]); setNoEncontrado(false); setError(null); setBusqueda(""); setMostrarAsistencias(false); setHistorialAsistencias(null); setTimeout(() => { inputRef.current?.focus(); setAutoSearchEnabled(true); }, DEBOUNCE_MS + 100); };
  const handleVentasGym = () => { if (!cliente) return; setClientePrecargado(cliente.cedula); setModulo("ventas-gym"); };
  const handleVentasTienda = () => { if (!cliente) return; setClientePrecargado(cliente.cedula); setModulo("ventas-tienda"); };
  const handleVerPagos = () => { if (!cliente) return; navegarAClientePagos(cliente.cedula); };
  const handleVerMedidas = () => { if (!cliente) return; navegarAClienteMedidas(cliente.cedula); };

  const handleRegistrarEntrada = async () => {
    if (!cliente) return;
    try {
      const db = await getDb();
      const hoyStr = today();
      const horaStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      await db.execute(`INSERT INTO asistencias (inscripcion, fecha, hora, tipo) VALUES ($1, $2, $3, 'E')`, [cliente.inscripcion, hoyStr, horaStr]);
      setCliente({ ...cliente, ya_vino_hoy: true, visitas_mes: cliente.visitas_mes + 1 });
    } catch (err) { console.error("[Recepción] Error:", err); }
  };

  const handleVerAsistencias = async () => {
    if (!cliente) return;
    try { const data = await getAsistenciasCliente(cliente.inscripcion, 20); setHistorialAsistencias(data); setMostrarAsistencias(true); }
    catch (err) { console.error("[Recepción] Error:", err); }
  };



  // =============================================
  // RENDER (diseño original con max-w-4xl)
  // =============================================
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Recepción</h1>
        <p className="text-slate-500 text-sm mt-1">Busque un cliente por cédula, número de inscripción o nombre</p>
      </div>

      {/* Buscador (diseño original) */}
      {!cliente && (
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input
              ref={inputRef}
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setNoEncontrado(false); setError(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Cédula, número de inscripción o nombre..."
              className={cn("pl-14 h-14 text-lg rounded-2xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-visible:ring-blue-500/50 bg-white transition-all", noEncontrado && "ring-2 ring-red-400")}
              autoComplete="off"
            />
          </div>
          <Button onClick={() => handleBuscar()} disabled={buscando || !busqueda.trim()} className="h-14 px-8 rounded-2xl text-base shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-blue-600 hover:bg-blue-700">
            {buscando ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Search className="w-5 h-5 mr-2" />Buscar</>}
          </Button>
        </div>
      )}



      {/* Mensajes y coincidencias */}
      {!cliente && (
        <div className="mb-6">
          {noEncontrado && (
            <div className="flex items-center gap-2 text-red-600 text-sm"><UserX className="w-4 h-4" /><span>Cliente no encontrado: <strong>{busqueda}</strong></span></div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm"><XCircle className="w-4 h-4" /><span>{error}</span></div>
          )}

          {/* Lista de coincidencias */}
          {coincidencias.length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="p-3 border-b bg-slate-50"><p className="text-sm font-medium text-slate-600">{coincidencias.length} coincidencias encontradas</p></div>
                <div className="max-h-48 overflow-auto">
                  {coincidencias.map((c) => (
                    <button key={c.cedula} onClick={() => handleSeleccionarCliente(c.cedula)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b last:border-b-0 text-left">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {c.foto_path ? <img src={`/fotos/${c.foto_path}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <User className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{c.nombres} {c.apellidos}</p>
                        <p className="text-xs text-slate-500">CC: {c.cedula} · #{c.inscripcion}</p>
                      </div>
                      <div className={cn("px-2 py-0.5 rounded text-xs font-medium", c.estado === "A" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{c.estado === "A" ? "Activo" : "Inactivo"}</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}



      {/* Ficha cliente */}
      {cliente && (
        <>
          <FichaCliente cliente={cliente} onVentasGym={handleVentasGym} onVentasTienda={handleVentasTienda} onVerPagos={handleVerPagos} onVerMedidas={handleVerMedidas} onVerAsistencias={handleVerAsistencias} onOtro={handleOtro} onFotoActualizada={(f) => setCliente({ ...cliente, foto_path: f })} onRegistrarEntrada={handleRegistrarEntrada} />

          {/* Modal Asistencias */}
          {mostrarAsistencias && historialAsistencias && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarAsistencias(false)}>
              <Card className="w-full max-w-sm max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <CardContent className="p-0">
                  <div className="p-3 border-b bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><History className="w-4 h-4" />Historial de Asistencias</h3>
                    <p className="text-xs text-slate-500">{cliente.nombre_completo}</p>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3 border-b">
                    <div className="text-center"><p className="text-xl font-bold text-slate-800">{historialAsistencias.visitasMes}</p><p className="text-xs text-slate-500">Este mes</p></div>
                    <div className="text-center"><p className="text-xl font-bold text-slate-800">{historialAsistencias.visitasTotal}</p><p className="text-xs text-slate-500">Total</p></div>
                  </div>
                  <div className="max-h-48 overflow-auto p-3">
                    {historialAsistencias.historial.length === 0 ? (<p className="text-center text-slate-400 py-4 text-sm">Sin registros</p>) : (
                      <div className="space-y-1.5">{historialAsistencias.historial.map((a, i) => (<div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50 text-sm"><span className="font-medium">{formatDate(a.fecha)}</span><span className="text-xs text-slate-500">{a.hora}</span></div>))}</div>
                    )}
                  </div>
                  <div className="p-3 border-t"><Button variant="outline" size="sm" className="w-full" onClick={() => setMostrarAsistencias(false)}>Cerrar</Button></div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}



      {/* Estado inicial con cards (diseño original) */}
      {!cliente && !noEncontrado && !buscando && coincidencias.length === 0 && (
        <>
          {/* Recientes */}
          {recientes.length > 0 && !busqueda && (
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" />Consultados recientemente</p>
              <div className="flex flex-wrap gap-2">
                {recientes.map((r) => (
                  <button key={r.cedula} onClick={() => handleSeleccionarReciente(r.cedula)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                      {r.foto_path ? <img src={`/fotos/${r.foto_path}`} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-slate-400" />}
                    </div>
                    <span className="text-slate-700 max-w-[100px] truncate">{r.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cards informativos */}
          {!busqueda && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Search, title: "Buscar cliente", desc: "Ingrese la cédula, número de inscripción o nombre", color: "text-blue-500", bg: "bg-gradient-to-br from-blue-50 to-slate-100/50" },
                { icon: Dumbbell, title: "Ventas Gym", desc: "Registre pagos de membresías y servicios", color: "text-indigo-500", bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/50" },
                { icon: Store, title: "Ventas Tienda", desc: "Venda suplementos, ropa y artículos", color: "text-emerald-500", bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50" },
              ].map((item) => (
                <Card key={item.title} className="border-0 bg-transparent overflow-hidden">
                  <div className={cn("p-6 text-center h-full flex flex-col items-center justify-center transition-transform hover:-translate-y-1 duration-300", item.bg)}>
                    <div className="p-3 bg-white rounded-2xl shadow-sm mb-3"><item.icon className={cn("w-6 h-6", item.color)} /></div>
                    <p className="text-sm font-bold text-slate-800 mb-1">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Atajos de teclado */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono">Enter</kbd> buscar · <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono">Esc</kbd> limpiar
        </p>
      </div>
    </div>
  );
}
