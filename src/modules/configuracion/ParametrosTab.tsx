import { useState, useEffect } from "react";
import { Save, Pencil, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import type { Parametros } from "@/db/types";
import { getParametros, updateParametros } from "@/db/queries/configuracion";

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
      }
    }).finally(() => setLoading(false));
  }, []);

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
      });
      success("Parámetros actualizados", "Los cambios serán visibles al reiniciar el sistema.");
      setEditando(false);
      const updated = await getParametros();
      if (updated) setParams(updated);
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
    }
    setEditando(false);
  };

  if (loading) return <PageLoading text="Cargando parámetros..." />;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Datos del gimnasio */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-600">Datos del Gimnasio</CardTitle>
            {!editando && (
              <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Modificar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Nombre del Gimnasio" required htmlFor="p-nom" className="col-span-2">
            <Input
              id="p-nom"
              value={nombreGimnasio}
              onChange={(e) => setNombreGimnasio(e.target.value.toUpperCase())}
              disabled={!editando}
              className={!editando ? "bg-slate-50" : ""}
            />
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
        </CardContent>
      </Card>

      {/* Parámetros operativos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600">Parámetros Operativos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Días sin actividad para inactivar" htmlFor="p-inact" description="Clientes con más de estos días sin pago aparecerán en Procesos para inactivar.">
            <Input
              id="p-inact" type="number" min="1" max="365"
              value={diasInactivar}
              onChange={(e) => setDiasInactivar(Number(e.target.value))}
              disabled={!editando}
              className={!editando ? "bg-slate-50" : ""}
            />
          </FormField>
          <FormField label="Días de alerta de vencimiento" htmlFor="p-alerta" description="El badge en el sidebar se activará cuando haya clientes con vencimiento en estos días.">
            <Input
              id="p-alerta" type="number" min="1" max="30"
              value={diasAlerta}
              onChange={(e) => setDiasAlerta(Number(e.target.value))}
              disabled={!editando}
              className={!editando ? "bg-slate-50" : ""}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Consecutivos (solo lectura) */}
      {params && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Consecutivos (solo información)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            {[
              { label: "Próxima inscripción", value: params.conse_ins },
              { label: "Próximo recibo gym", value: params.conse_rec },
              { label: "Próxima factura tienda", value: params.conse_fac },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-800">#{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Botones */}
      {editando && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={cancelar}><X className="w-4 h-4 mr-1.5" />Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando}>
            {guardando ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span> : <><Save className="w-4 h-4 mr-1.5" />Guardar Cambios</>}
          </Button>
        </div>
      )}
    </div>
  );
}
