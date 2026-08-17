import { useState, useEffect } from "react";
import { Save, Pencil, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import type { Parametros } from "@/db/types";
import { getParametros, updateParametros } from "@/db/queries/configuracion";
import { hexToHsl } from "@/lib/utils";

export function ParametrosTab() {
  const [params, setParams] = useState<Parametros | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Form state
  const [nombreGimnasio, setNombreGimnasio] = useState("");
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [diasInactivar, setDiasInactivar] = useState(90);
  const [diasAlerta, setDiasAlerta] = useState(5);
  
  // Nuevos campos
  const [logoBase64, setLogoBase64] = useState("");
  const [mensajeRecibo, setMensajeRecibo] = useState("");
  const [textoResolucion, setTextoResolucion] = useState("");
  const [formatoImpresora, setFormatoImpresora] = useState("POS-80");
  const [colorPrimario, setColorPrimario] = useState("#1e40af");
  const [ivaDefecto, setIvaDefecto] = useState(0);
  const [permitirSinStock, setPermitirSinStock] = useState(1);
  
  const { success, error } = useToast();

  useEffect(() => {
    getParametros().then((p) => {
      if (p) {
        setParams(p);
        setNombreGimnasio(p.nombre_gimnasio);
        setNit(p.nit ?? "");
        setDireccion(p.direccion ?? "");
        setTelefono(p.telefono ?? "");
        setDiasInactivar(p.dias_inactivar);
        setDiasAlerta(p.dias_alerta_vencimiento);
        setLogoBase64(p.logo_path ?? "");
        setMensajeRecibo(p.mensaje_recibo ?? "");
        setTextoResolucion(p.texto_resolucion ?? "");
        setFormatoImpresora(p.formato_impresora || "POS-80");
        setColorPrimario(p.color_primario || "#1e40af");
        setIvaDefecto(p.iva_por_defecto ?? 0);
        setPermitirSinStock(p.permitir_sin_stock ?? 1);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardar = async () => {
    if (!nombreGimnasio.trim()) { error("Falta nombre", "El nombre del gimnasio es requerido."); return; }
    setGuardando(true);
    try {
      await updateParametros({
        nombre_gimnasio: nombreGimnasio.toUpperCase(),
        nit: nit || null,
        direccion: direccion || null,
        telefono: telefono || null,
        dias_inactivar: diasInactivar,
        dias_alerta_vencimiento: diasAlerta,
        logo_path: logoBase64 || null,
        mensaje_recibo: mensajeRecibo || null,
        texto_resolucion: textoResolucion || null,
        formato_impresora: formatoImpresora,
        color_primario: colorPrimario,
        iva_por_defecto: ivaDefecto,
        permitir_sin_stock: permitirSinStock,
      });
      success("Parámetros actualizados", "Los cambios se guardaron correctamente.");
      setEditando(false);
      const updated = await getParametros();
      if (updated) setParams(updated);
      
      // Aplicar color en tiempo real si es posible
      document.documentElement.style.setProperty("--primary", hexToHsl(colorPrimario));
    } catch (err) {
      error("Error", String(err));
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    if (params) {
      setNombreGimnasio(params.nombre_gimnasio);
      setNit(params.nit ?? "");
      setDireccion(params.direccion ?? "");
      setTelefono(params.telefono ?? "");
      setDiasInactivar(params.dias_inactivar);
      setDiasAlerta(params.dias_alerta_vencimiento);
      setLogoBase64(params.logo_path ?? "");
      setMensajeRecibo(params.mensaje_recibo ?? "");
      setTextoResolucion(params.texto_resolucion ?? "");
      setFormatoImpresora(params.formato_impresora || "POS-80");
      setColorPrimario(params.color_primario || "#1e40af");
      setIvaDefecto(params.iva_por_defecto ?? 0);
      setPermitirSinStock(params.permitir_sin_stock ?? 1);
    }
    setEditando(false);
  };

  if (loading) return <PageLoading text="Cargando parámetros..." />;

  return (
    <div className="overflow-y-auto flex-1 min-h-0">
    <div className="max-w-4xl space-y-6 pb-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Configuración General</h2>
          <p className="text-sm text-slate-500">Personaliza la apariencia y el comportamiento de SAGIM.</p>
        </div>
        {!editando ? (
          <Button onClick={() => setEditando(true)}>
            <Pencil className="w-4 h-4 mr-1.5" />Modificar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelar}><X className="w-4 h-4 mr-1.5" />Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-1.5" />}
              Guardar Cambios
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos del Negocio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Datos del Gimnasio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Nombre del Gimnasio" required htmlFor="p-nom" className="col-span-2">
              <Input id="p-nom" value={nombreGimnasio} onChange={(e) => setNombreGimnasio(e.target.value.toUpperCase())} disabled={!editando} className={!editando ? "bg-slate-50" : ""} />
            </FormField>
            <FormField label="NIT / RUT" htmlFor="p-nit">
              <Input id="p-nit" value={nit} onChange={(e) => setNit(e.target.value)} disabled={!editando} className={!editando ? "bg-slate-50" : ""} />
            </FormField>
            <FormField label="Teléfono" htmlFor="p-tel">
              <Input id="p-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={!editando} className={!editando ? "bg-slate-50" : ""} />
            </FormField>
            <FormField label="Dirección" htmlFor="p-dir" className="col-span-2">
              <Input id="p-dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} disabled={!editando} className={!editando ? "bg-slate-50" : ""} />
            </FormField>
            <div className="col-span-2 mt-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Logo del Gimnasio (Para reportes y PDFs)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded border bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoBase64 ? <img src={logoBase64} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                </div>
                {editando && (
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs max-w-[250px]" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facturación y Legal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Facturación e Impresión POS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Resolución DIAN / Texto Legal" htmlFor="p-res" description="Se imprimirá en la cabecera de los recibos.">
              <textarea
                id="p-res"
                value={textoResolucion}
                onChange={(e) => setTextoResolucion(e.target.value)}
                disabled={!editando}
                rows={2}
                className={`w-full p-2 text-sm border rounded-md resize-none ${!editando ? "bg-slate-50 text-slate-500" : ""}`}
                placeholder="Ej: Resolución de facturación No. 12345..."
              />
            </FormField>
            <FormField label="Mensaje de Despedida" htmlFor="p-msg" description="Se imprimirá al final del recibo POS.">
              <textarea
                id="p-msg"
                value={mensajeRecibo}
                onChange={(e) => setMensajeRecibo(e.target.value)}
                disabled={!editando}
                rows={2}
                className={`w-full p-2 text-sm border rounded-md resize-none ${!editando ? "bg-slate-50 text-slate-500" : ""}`}
                placeholder="Ej: ¡Gracias por preferirnos! Recuerde traer toalla."
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Formato Impresora" htmlFor="p-fmt">
                <select
                  id="p-fmt"
                  value={formatoImpresora}
                  onChange={(e) => setFormatoImpresora(e.target.value)}
                  disabled={!editando}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="POS-80">Tickets (80mm)</option>
                  <option value="POS-58">Tickets (58mm)</option>
                  <option value="A4">Carta / A4</option>
                </select>
              </FormField>
              <FormField label="IVA por defecto (%)" htmlFor="p-iva">
                <Input
                  id="p-iva" type="number" min="0" max="100"
                  value={ivaDefecto}
                  onChange={(e) => setIvaDefecto(Number(e.target.value))}
                  disabled={!editando}
                  className={!editando ? "bg-slate-50" : ""}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Reglas Operativas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Reglas y Operatividad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Días para inactivar cliente" htmlFor="p-inact" description="Después de vencidos.">
                <Input
                  id="p-inact" type="number" min="1" max="365"
                  value={diasInactivar}
                  onChange={(e) => setDiasInactivar(Number(e.target.value))}
                  disabled={!editando}
                  className={!editando ? "bg-slate-50" : ""}
                />
              </FormField>
              <FormField label="Días de alerta vencimiento" htmlFor="p-alerta">
                <Input
                  id="p-alerta" type="number" min="1" max="30"
                  value={diasAlerta}
                  onChange={(e) => setDiasAlerta(Number(e.target.value))}
                  disabled={!editando}
                  className={!editando ? "bg-slate-50" : ""}
                />
              </FormField>
            </div>
            
            <div className="pt-2 border-t flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Permitir Ventas sin Stock</p>
                <p className="text-xs text-slate-500">Si se desactiva, la tienda bloqueará ventas si el artículo llegó a 0.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={permitirSinStock === 1}
                  onChange={(e) => setPermitirSinStock(e.target.checked ? 1 : 0)}
                  disabled={!editando}
                />
                <div className={`w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${permitirSinStock === 1 && !(!editando) ? 'bg-blue-600' : ''} ${!editando ? 'opacity-50' : ''}`}></div>
              </label>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-slate-700 mb-2">Color del Tema (Primary)</p>
              <div className="flex items-center gap-3">
                <Input 
                  type="color" 
                  value={colorPrimario} 
                  onChange={(e) => setColorPrimario(e.target.value)}
                  disabled={!editando}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <span className="text-xs font-mono bg-slate-100 p-1 rounded">{colorPrimario}</span>
                {editando && (
                  <Button variant="ghost" size="sm" onClick={() => setColorPrimario("#1e40af")} className="text-xs text-slate-500">
                    Restaurar Azul Original
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consecutivos */}
        {params && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Consecutivos (solo información)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {[
                { label: "Próxima Inscripción", value: params.conse_ins },
                { label: "Próximo Recibo Gym", value: params.conse_rec },
                { label: "Próxima Factura Tienda", value: params.conse_fac },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3 text-center border">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-xl font-black text-slate-800">#{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
}
