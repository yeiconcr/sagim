import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, X, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { useToast } from "@/store/toastStore";
import type { Actividad } from "@/db/types";
import { getActividades, createActividad, updateActividad, toggleActividadEstado } from "@/db/queries/catalogos";
import { formatCurrency, cn } from "@/lib/utils";

const schema = z.object({
  codigo: z.string().min(1, "Código requerido").max(20),
  nombre: z.string().min(1, "Nombre requerido").max(100),
  tarifa: z.coerce.number().min(0),
  factor: z.coerce.number().min(1, "Factor mínimo 1 día").max(365),
  periodicidad: z.enum(["M", "U"]),
  impuesto: z.coerce.number().min(0).max(100),
  estado: z.enum(["A", "I"]),
});
type FormValues = z.infer<typeof schema>;

export function ActividadesTab() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [editando, setEditando] = useState<Actividad | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    setActividades(await getActividades(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { periodicidad: "M", factor: 30, impuesto: 0, estado: "A", tarifa: 0 },
  });

  const abrirNuevo = () => {
    reset({ periodicidad: "M", factor: 30, impuesto: 0, estado: "A", tarifa: 0 });
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (act: Actividad) => {
    reset({ codigo: act.codigo, nombre: act.nombre, tarifa: act.tarifa, factor: act.factor, periodicidad: act.periodicidad, impuesto: act.impuesto, estado: act.estado });
    setEditando(act);
    setMostrarForm(true);
  };

  const cerrar = () => { setMostrarForm(false); setEditando(null); reset(); };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editando) {
        await updateActividad(editando.id, { nombre: data.nombre, tarifa: data.tarifa, factor: data.factor, periodicidad: data.periodicidad, impuesto: data.impuesto, estado: data.estado });
        success("Actividad actualizada");
      } else {
        await createActividad({ codigo: data.codigo, nombre: data.nombre, tarifa: data.tarifa, factor: data.factor, periodicidad: data.periodicidad, impuesto: data.impuesto, estado: data.estado });
        success("Actividad creada");
      }
      cerrar();
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const handleToggle = async (act: Actividad) => {
    try {
      await toggleActividadEstado(act.id, act.estado === "A" ? "I" : "A");
      success(act.estado === "A" ? "Actividad inactivada" : "Actividad activada");
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const columns: ColumnDef<Actividad>[] = [
    { accessorKey: "codigo", header: "Código", size: 80, cell: ({ getValue }) => <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{getValue<string>()}</span> },
    { accessorKey: "nombre", header: "Nombre", cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span> },
    { accessorKey: "tarifa", header: "Tarifa", size: 110, cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "factor", header: "Días", size: 70, cell: ({ getValue }) => <span className="text-sm text-center block">{getValue<number>()}</span> },
    {
      accessorKey: "periodicidad", header: "Tipo", size: 80,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs">
          {getValue<string>() === "M" ? "Mensual" : "Única vez"}
        </Badge>
      ),
    },
    {
      accessorKey: "estado", header: "Estado", size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === "A" ? "success" : "secondary"} className="text-xs">
          {getValue<string>() === "A" ? "ACTIVA" : "INACTIVA"}
        </Badge>
      ),
    },
    {
      id: "acciones", header: "", size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); abrirEditar(row.original); }}>
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleToggle(row.original); }}>
            {row.original.estado === "A"
              ? <ToggleRight className="w-3.5 h-3.5 text-green-500" />
              : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
            }
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {mostrarForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              {editando ? `Editar: ${editando.nombre}` : "Nueva Actividad"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <FormField label="Código" required error={errors.codigo?.message} htmlFor="act-cod">
                  <Input id="act-cod" {...register("codigo")} disabled={!!editando} className={cn(errors.codigo && "border-destructive")} placeholder="Ej: GYM01" />
                </FormField>
                <FormField label="Nombre" required error={errors.nombre?.message} htmlFor="act-nom" className="col-span-2">
                  <Input id="act-nom" {...register("nombre")} className={cn(errors.nombre && "border-destructive")} />
                </FormField>
                <FormField label="Estado">
                  <Controller name="estado" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Activa</SelectItem>
                        <SelectItem value="I">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Tarifa ($)" required error={errors.tarifa?.message} htmlFor="act-tar">
                  <Input id="act-tar" type="number" step="0.01" min="0" {...register("tarifa")} className={cn(errors.tarifa && "border-destructive")} />
                </FormField>
                <FormField label="Factor (días de duración)" required error={errors.factor?.message} htmlFor="act-fac">
                  <Input id="act-fac" type="number" min="1" {...register("factor")} className={cn(errors.factor && "border-destructive")} />
                </FormField>
                <FormField label="Tipo de cobro">
                  <Controller name="periodicidad" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Mensual (recurrente)</SelectItem>
                        <SelectItem value="U">Única vez</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Impuesto %" htmlFor="act-imp">
                  <Input id="act-imp" type="number" step="0.01" min="0" max="100" {...register("impuesto")} />
                </FormField>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                💡 El <strong>Factor</strong> determina cuántos días dura la membresía al pagar esta actividad. Ej: 30 = mensual, 15 = quincenal.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cerrar}><X className="w-3.5 h-3.5 mr-1" />Cancelar</Button>
                <Button type="submit" size="sm"><Save className="w-3.5 h-3.5 mr-1" />{editando ? "Guardar" : "Crear"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{actividades.filter(a => a.estado === "A").length} actividades activas de {actividades.length}</p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}><Plus className="w-4 h-4 mr-1.5" />Nueva Actividad</Button>
        )}
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
        <DataTable columns={columns} data={actividades} searchPlaceholder="Buscar actividades..." onRowClick={abrirEditar} emptyMessage="No hay actividades." pageSize={15} />
      </div>
    </div>
  );
}
