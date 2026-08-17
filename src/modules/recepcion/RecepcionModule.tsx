import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Dumbbell, Store, UserX, RefreshCw,
  Phone, MapPin, Hash, Calendar, AlertTriangle,
  CheckCircle2, XCircle, Clock, User,
} from "lucide-react";
import { cn, formatDate, today, addDays, toISODate, daysBetween } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/appStore";
import { getDb } from "@/db/database";

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
  // calculados
  nombre_completo: string;
  proximo_vencimiento: string | null;
  actividad_vigente: string | null;
  dias_restantes: number | null;
}

type EstadoVencimiento = "vigente" | "vence-hoy" | "vence-pronto" | "vencido" | "sin-pagos";

// =============================================
// HELPERS
// =============================================
function calcularEstadoVencimiento(diasRestantes: number | null): EstadoVencimiento {
  if (diasRestantes === null) return "sin-pagos";
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes === 0) return "vence-hoy";
  if (diasRestantes <= 5) return "vence-pronto";
  return "vigente";
}

const ESTADO_VENC_CONFIG: Record<EstadoVencimiento, {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}> = {
  vigente:      { label: "VIGENTE",       color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: CheckCircle2 },
  "vence-hoy":  { label: "VENCE HOY",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: AlertTriangle },
  "vence-pronto": { label: "VENCE PRONTO", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  vencido:      { label: "VENCIDO",       color: "text-red-700",    bg: "bg-red-50 border-red-200",      icon: XCircle },
  "sin-pagos":  { label: "SIN PAGOS",     color: "text-slate-500",  bg: "bg-slate-50 border-slate-200",  icon: Clock },
};

// =============================================
// QUERY PRINCIPAL — buscar cliente + vencimiento
// =============================================
async function buscarCliente(termino: string): Promise<ClienteRecepcion | null> {
  if (!termino.trim()) return null;
  const db = await getDb();

  // Buscar por cédula o inscripción
  const isNumeric = /^\d+$/.test(termino.trim());
  let rows: ClienteRecepcion[];

  if (isNumeric) {
    rows = await db.select<ClienteRecepcion[]>(`
      SELECT inscripcion, cedula, nombres, apellidos, ciudad, direccion,
             celular, telefono, sexo, estado, fecha_nacimiento, foto_path
      FROM clientes
      WHERE cedula = $1 OR CAST(inscripcion AS TEXT) = $1
      LIMIT 1
    `, [termino.trim()]);
  } else {
    // Búsqueda por nombre (contiene)
    rows = await db.select<ClienteRecepcion[]>(`
      SELECT inscripcion, cedula, nombres, apellidos, ciudad, direccion,
             celular, telefono, sexo, estado, fecha_nacimiento, foto_path
      FROM clientes
      WHERE nombres LIKE $1 OR apellidos LIKE $1
      ORDER BY nombres ASC
      LIMIT 1
    `, [`%${termino.trim()}%`]);
  }

  if (rows.length === 0) return null;
  const c = rows[0];

  // Calcular próximo vencimiento: último pago mensual + factor
  const pagos = await db.select<Array<{
    fecha_pag: string;
    factor: number;
    nombre: string;
  }>>(`
    SELECT p.fecha_pag, a.factor, a.nombre
    FROM pagos_cli p
    JOIN actividades a ON a.codigo = p.id_actividad
    WHERE p.inscripcion = $1
      AND p.estado = 'A'
      AND p.periodicidad = 'M'
    ORDER BY p.fecha_pag DESC
    LIMIT 1
  `, [c.inscripcion]);

  let proximo_vencimiento: string | null = null;
  let actividad_vigente: string | null = null;
  let dias_restantes: number | null = null;

  if (pagos.length > 0) {
    const ultimo = pagos[0];
    const fechaVenc = toISODate(addDays(ultimo.fecha_pag, ultimo.factor));
    proximo_vencimiento = fechaVenc;
    actividad_vigente = ultimo.nombre;
    dias_restantes = daysBetween(today(), fechaVenc);
  }

  return {
    ...c,
    nombre_completo: `${c.nombres} ${c.apellidos}`,
    proximo_vencimiento,
    actividad_vigente,
    dias_restantes,
  };
}

// =============================================
// COMPONENTE FICHA CLIENTE
// =============================================
interface FichaClienteProps {
  cliente: ClienteRecepcion;
  onVentasGym: () => void;
  onVentasTienda: () => void;
  onOtro: () => void;
}

function FichaCliente({ cliente, onVentasGym, onVentasTienda, onOtro }: FichaClienteProps) {
  const estadoVenc = calcularEstadoVencimiento(cliente.dias_restantes);
  const vencConfig = ESTADO_VENC_CONFIG[estadoVenc];
  const VencIcon = vencConfig.icon;
  const clienteInactivo = cliente.estado === "I";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
      {/* ---- COLUMNA IZQUIERDA: foto + estado ---- */}
      <div className="flex flex-col gap-4">
        {/* Foto */}
        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-slate-100 relative flex items-center justify-center">
            {cliente.foto_path ? (
              <img
                src={`/fotos/${cliente.foto_path}`}
                alt={cliente.nombre_completo}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <User className="w-16 h-16" />
                <span className="text-xs">Sin foto</span>
              </div>
            )}
            {/* Badge estado cliente */}
            <div className={cn(
              "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold border",
              clienteInactivo
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-green-100 text-green-700 border-green-200"
            )}>
              {clienteInactivo ? "INACTIVO" : "ACTIVO"}
            </div>
          </div>
        </Card>

        {/* Estado de vencimiento */}
        <Card className={cn("border", vencConfig.bg)}>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-2 mb-2", vencConfig.color)}>
              <VencIcon className="w-5 h-5 flex-shrink-0" />
              <span className="font-bold text-sm">{vencConfig.label}</span>
            </div>
            {cliente.proximo_vencimiento ? (
              <>
                <p className="text-xs text-slate-500 mb-1">Próximo vencimiento:</p>
                <p className={cn("text-sm font-semibold", vencConfig.color)}>
                  {formatDate(cliente.proximo_vencimiento)}
                </p>
                {cliente.dias_restantes !== null && (
                  <p className="text-xs text-slate-400 mt-1">
                    {cliente.dias_restantes < 0
                      ? `Venció hace ${Math.abs(cliente.dias_restantes)} día${Math.abs(cliente.dias_restantes) !== 1 ? "s" : ""}`
                      : cliente.dias_restantes === 0
                        ? "Vence hoy"
                        : `En ${cliente.dias_restantes} día${cliente.dias_restantes !== 1 ? "s" : ""}`
                    }
                  </p>
                )}
                {cliente.actividad_vigente && (
                  <p className="text-xs text-slate-500 mt-2 italic truncate">
                    {cliente.actividad_vigente}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">No tiene pagos registrados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- COLUMNA CENTRAL: datos personales ---- */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Nombre e inscripción */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-slate-800 truncate">
                  {cliente.nombre_completo}
                </h2>
                <p className="text-slate-500 text-sm">
                  {cliente.sexo === "1" ? "Masculino" : cliente.sexo === "2" ? "Femenino" : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-blue-600">
                  <Hash className="w-4 h-4" />
                  <span className="text-lg font-black">{cliente.inscripcion}</span>
                </div>
                <p className="text-xs text-slate-400">Inscripción</p>
              </div>
            </div>

            {/* Datos de contacto */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
              <DataItem icon={Hash} label="Cédula" value={cliente.cedula} />
              <DataItem icon={Phone} label="Celular" value={cliente.celular || cliente.telefono || "—"} />
              <DataItem icon={MapPin} label="Ciudad" value={cliente.ciudad || "—"} />
              <DataItem
                icon={Calendar}
                label="Fecha nacimiento"
                value={cliente.fecha_nacimiento ? formatDate(cliente.fecha_nacimiento) : "—"}
              />
            </div>

            {cliente.direccion && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-slate-400 mb-1">Dirección</p>
                <p className="text-sm text-slate-600">{cliente.direccion}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            icon={Dumbbell}
            label="Ventas Gym"
            description="Cobrar membresía o servicio"
            color="blue"
            disabled={clienteInactivo}
            onClick={onVentasGym}
          />
          <ActionButton
            icon={Store}
            label="Ventas Tienda"
            description="Vender artículos del inventario"
            color="green"
            onClick={onVentasTienda}
          />
        </div>

        {/* Botón otro cliente */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onOtro}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Buscar otro cliente
        </Button>
      </div>
    </div>
  );
}

// ---- Sub-componentes ----
function DataItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  color: "blue" | "green" | "orange";
  disabled?: boolean;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, description, color, disabled, onClick }: ActionButtonProps) {
  const colorMap = {
    blue:   "bg-blue-600 hover:bg-blue-700 text-white",
    green:  "bg-emerald-600 hover:bg-emerald-700 text-white",
    orange: "bg-orange-500 hover:bg-orange-600 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl text-left",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        colorMap[color]
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-80 leading-tight mt-0.5 truncate">{description}</p>
      </div>
    </button>
  );
}

// =============================================
// MÓDULO PRINCIPAL
// =============================================
export function RecepcionModule() {
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteRecepcion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setModulo, setClientePrecargado, clientePrecargado } = useAppStore();

  // Si hay cliente precargado desde otro módulo, buscarlo automáticamente
  useEffect(() => {
    if (clientePrecargado) {
      setBusqueda(clientePrecargado);
      handleBuscar(clientePrecargado);
      setClientePrecargado(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus automático al abrir el módulo
  useEffect(() => {
    if (!cliente) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cliente]);

  // Tecla Esc global para limpiar ficha
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && cliente) {
        handleOtro();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const handleBuscar = useCallback(async (termino = busqueda) => {
    if (!termino.trim()) return;
    setBuscando(true);
    setNoEncontrado(false);
    setError(null);
    setCliente(null);

    try {
      const resultado = await buscarCliente(termino);
      if (resultado) {
        setCliente(resultado);
      } else {
        setNoEncontrado(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error("[Recepción] Error:", err);
      setError("Error al consultar la base de datos.");
    } finally {
      setBuscando(false);
    }
  }, [busqueda]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBuscar();
    if (e.key === "Escape") handleOtro();
  };

  const handleOtro = () => {
    setCliente(null);
    setNoEncontrado(false);
    setError(null);
    setBusqueda("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleVentasGym = () => {
    if (!cliente) return;
    setClientePrecargado(cliente.cedula);
    setModulo("ventas-gym");
  };

  const handleVentasTienda = () => {
    if (!cliente) return;
    setClientePrecargado(cliente.cedula);
    setModulo("ventas-tienda");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Recepción</h1>
        <p className="text-slate-500 text-sm mt-1">
          Busque un cliente por cédula, número de inscripción o nombre
        </p>
      </div>

      {/* ---- BUSCADOR ---- */}
      {!cliente && (
        <div className="mb-8 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input
              ref={inputRef}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setNoEncontrado(false);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Cédula, número de inscripción o nombre..."
              className={cn(
                "pl-14 h-14 text-lg rounded-2xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-visible:ring-blue-500/50 bg-white transition-all",
                noEncontrado && "ring-2 ring-red-400"
              )}
              autoComplete="off"
            />
          </div>
          <Button
            onClick={() => handleBuscar()}
            disabled={buscando || !busqueda.trim()}
            className="h-14 px-8 rounded-2xl text-base shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-blue-600 hover:bg-blue-700"
          >
            {buscando ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>
      )}
      {!cliente && (
        <div className="mb-6">
          {/* Mensajes de estado */}
            {noEncontrado && (
              <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                <UserX className="w-4 h-4 flex-shrink-0" />
                <span>
                  Cliente no encontrado con: <strong>{busqueda}</strong>
                </span>
              </div>
            )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm ml-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ---- FICHA CLIENTE ---- */}
      {cliente && (
        <FichaCliente
          cliente={cliente}
          onVentasGym={handleVentasGym}
          onVentasTienda={handleVentasTienda}
          onOtro={handleOtro}
        />
      )}

      {/* ---- ESTADO INICIAL (sin búsqueda) ---- */}
      {!cliente && !noEncontrado && !buscando && !busqueda && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Search,
              title: "Buscar cliente",
              desc: "Ingrese la cédula, número de inscripción o nombre en el campo de búsqueda",
              color: "text-blue-500",
              bg: "bg-gradient-to-br from-blue-50 to-slate-100/50",
            },
            {
              icon: Dumbbell,
              title: "Ventas Gym",
              desc: "Registre pagos de membresías, planes y servicios del gimnasio",
              color: "text-indigo-500",
              bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/50",
            },
            {
              icon: Store,
              title: "Ventas Tienda",
              desc: "Venda suplementos, ropa y artículos del inventario",
              color: "text-emerald-500",
              bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
            },
          ].map((item) => (
            <Card key={item.title} className="border-0 bg-transparent overflow-hidden">
              <div className={cn("p-8 text-center h-full flex flex-col items-center justify-center transition-transform hover:-translate-y-1 duration-300", item.bg)}>
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                  <item.icon className={cn("w-8 h-8", item.color)} />
                </div>
                <p className="text-base font-bold text-slate-800 mb-2">{item.title}</p>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---- ATAJOS DE TECLADO ---- */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          Presione <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono">Enter</kbd> para buscar
          {" · "}
          <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono">Esc</kbd> para limpiar
        </p>
      </div>
    </div>
  );
}
