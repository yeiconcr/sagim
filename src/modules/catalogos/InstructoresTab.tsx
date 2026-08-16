import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, X, Save, UserCheck, UserX } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/store/toastStore";
import type { Instructor, Especialidad } from "@/db/types";
import {
  getInstructores, createInstructor, updateInstructor,
  toggleInstructorEstado, getEspecialidades,
} from "@/db/queries/catalogos";
import { formatCurrency, cn } from "@/lib/utils";

const schema = z.object({
  cedula: z.string().min(1, "Cédula requerida").regex(/^\d+$/, "Solo números"),
  nombres: z.string().min(1, "Nombres requeridos"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  id_especialidad: z.coerce.number().optional(),
  tarifa: z.coerce.number().min(0, "Tarifa no puede ser negativa"),
  estado: z.enum(["A", "I"]),
});
type FormValues = z.infer<typeof schema>;

export function InstructoresTab() {
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [editando, setEditando] = useState<Instructor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Instructor | null>(null);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    const [inst, esp] = await Promise.all([
      getInstructores(false),
      getEspecialidades(false),
    ]);
    setInstructores(inst);
    setEspecialidades(esp);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: "A", tarifa: 0 },
  });

  const abrirNuevo = () => {
    reset({ estado: "A", tarifa: 0 });
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (inst: Instructor) => {
    reset({
      cedula: inst.cedula,
      nombres: inst.nombres,
      apellidos: inst.apellidos,
      direccion: inst.direccion ?? "",
      telefono: inst.telefono ?? "",
      celular: inst.celular ?? "",
      email: inst.email ?? "",
      id_especialidad: inst.id_especialidad ?? undefined,
      tarifa: inst.tarifa,
      estado: inst.estado,
    });
    setEditando(inst);
    setMostrarForm(true);
  };

  const cerrar = () => { setMostrarForm(false); setEditando(null); reset(); };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editando) {
        await updateInstructor(editando.id, {
          nombres: data.nombres.toUpperCase(),
          apellidos: data.apellidos.toUpperCase(),
          direccion: data.direccion || null,
          telefono: data.telefono || null,
          celular: data.celular || null,
          email: data.email || null,
          id_especialidad: data.id_especialidad || null,
          tarifa: data.tarifa,
          estado: data.estado,
        });
        success("Instructor actualizado");
      } else {
        await createInstructor({
          cedula: data.cedula,
          nombres: data.nombres.toUpperCase(),
          apellidos: data.apellidos.toUpperCase(),
          direccion: data.direccion || null,
          telefono: data.telefono || null,
          celular: data.celular || null,
          email: data.email || null,
          id_especialidad: data.id_especialidad || null,
          tarifa: data.tarifa,
          estado: data.estado,
        });
        success("Instructor creado");
      }
      cerrar();
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    try {
      await toggleInstructorEstado(confirmToggle.id, confirmToggle.estado === "A" ? "I" : "A");
      success(confirmToggle.estado === "A" ? "Instructor inactivado" : "Instructor activado");
      cargar();
    } catch (err) {
      error("Error", String(err));
    } finally {
      setConfirmToggle(null);
    }
  };

  const columns: ColumnDef<Instructor>[] = [
    {
      id: "nombre",
      header: "Nombre",
      accessorFn: (r) => `${r.nombres} ${r.apellidos}`,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.nombres} {row.original.apellidos}</p>
          <p className="text-xs text-slate-400">{row.original.cedula}</p>
        </div>
      ),
    },
    {
      accessorKey: "nombre_especialidad",
      header: "Especialidad",
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "tarifa",
      header: "Tarifa",
      size: 110,
      cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span>,
    },
    {
      accessorKey: "celular",
      header: "Celular",
      size: 110,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "estado",
      header: "Estado",
      size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === "A" ? "success" : "secondary"} className="text-xs">
          {getValue<string>() === "A" ? "ACTIVO" : "INACTIVO"}
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
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setConfirmToggle(row.original); }}>
            {row.original.estado === "A"
              ? <UserX className="w-3.5 h-3.5 text-orange-500" />
              : <UserCheck className="w-3.5 h-3.5 text-green-500" />
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
              {editando ? `Editar: ${editando.nombres}` : "Nuevo Instructor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <FormField label="Cédula" required error={errors.cedula?.message} htmlFor="inst-ced">
                  <Input id="inst-ced" {...register("cedula")} disabled={!!editando} className={cn(errors.cedula && "border-destructive")} />
                </FormField>
                <FormField label="Nombres" required error={errors.nombres?.message} htmlFor="inst-nom">
                  <Input id="inst-nom" {...register("nombres", { onChange: (e) => e.target.value = e.target.value.toUpperCase() })} className={cn(errors.nombres && "border-destructive")} />
                </FormField>
                <FormField label="Apellidos" required error={errors.apellidos?.message} htmlFor="inst-ape">
                  <Input id="inst-ape" {...register("apellidos", { onChange: (e) => e.target.value = e.target.value.toUpperCase() })} className={cn(errors.apellidos && "border-destructive")} />
                </FormField>
                <FormField label="Celular" htmlFor="inst-cel">
                  <Input id="inst-cel" {...register("celular")} />
                </FormField>
                <FormField label="Especialidad" htmlFor="inst-esp">
                  <Controller name="id_especialidad" control={control} render={({ field }) => (
                    <Select value={field.value?.toString() ?? ""} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                      <SelectTrigger><SelectValue placeholder="Sin especialidad" /></SelectTrigger>
                      <SelectContent>
                        {especialidades.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Tarifa por hora" required error={errors.tarifa?.message} htmlFor="inst-tar">
                  <Input id="inst-tar" type="number" step="0.01" min="0" {...register("tarifa")} className={cn(errors.tarifa && "border-destructive")} />
                </FormField>
                <FormField label="Estado" htmlFor="inst-est">
                  <Controller name="estado" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Activo</SelectItem>
                        <SelectItem value="I">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Email" error={errors.email?.message} htmlFor="inst-ema">
                  <Input id="inst-ema" type="email" {...register("email")} className={cn(errors.email && "border-destructive")} />
                </FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cerrar}><X className="w-3.5 h-3.5 mr-1" />Cancelar</Button>
                <Button type="submit" size="sm"><Save className="w-3.5 h-3.5 mr-1" />{editando ? "Guardar" : "Crear"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{instructores.filter(i => i.estado === "A").length} instructores activos</p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="w-4 h-4 mr-1.5" />Nuevo Instructor
          </Button>
        )}
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
        <DataTable columns={columns} data={instructores} searchPlaceholder="Buscar instructores..." onRowClick={abrirEditar} emptyMessage="No hay instructores registrados." pageSize={15} />
      </div>

      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        title={confirmToggle?.estado === "A" ? "¿Inactivar instructor?" : "¿Activar instructor?"}
        description={`${confirmToggle?.nombres} ${confirmToggle?.apellidos} quedará ${confirmToggle?.estado === "A" ? "inactivo" : "activo"}.`}
        confirmLabel={confirmToggle?.estado === "A" ? "Inactivar" : "Activar"}
        variant={confirmToggle?.estado === "A" ? "destructive" : "default"}
        onConfirm={handleToggle}
      />
    </div>
  );
}
