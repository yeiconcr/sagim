import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, X, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { useToast } from "@/store/toastStore";
import type { Especialidad } from "@/db/types";
import { getEspecialidades, createEspecialidad, updateEspecialidad, toggleEspecialidadEstado } from "@/db/queries/catalogos";
import { cn } from "@/lib/utils";

const schema = z.object({ nombre: z.string().min(1, "Nombre requerido").max(100) });
type FormValues = z.infer<typeof schema>;

export function EspecialidadesTab() {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [editando, setEditando] = useState<Especialidad | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    setEspecialidades(await getEspecialidades(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const abrirNuevo = () => { reset({ nombre: "" }); setEditando(null); setMostrarForm(true); };
  const abrirEditar = (e: Especialidad) => { reset({ nombre: e.nombre }); setEditando(e); setMostrarForm(true); };
  const cerrar = () => { setMostrarForm(false); setEditando(null); reset(); };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editando) {
        await updateEspecialidad(editando.id, data.nombre);
        success("Especialidad actualizada");
      } else {
        await createEspecialidad(data.nombre);
        success("Especialidad creada");
      }
      cerrar();
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const handleToggle = async (esp: Especialidad) => {
    try {
      await toggleEspecialidadEstado(esp.id, esp.estado === "A" ? "I" : "A");
      success(esp.estado === "A" ? "Especialidad inactivada" : "Especialidad activada");
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const columns: ColumnDef<Especialidad>[] = [
    { accessorKey: "nombre", header: "Especialidad", cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span> },
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
        <div className="flex items-end gap-3 p-4 bg-white rounded-lg border">
          <FormField label={editando ? "Editar especialidad" : "Nueva especialidad"} error={errors.nombre?.message} htmlFor="esp-nom" className="flex-1">
            <Input id="esp-nom" {...register("nombre")} placeholder="Nombre de la especialidad" className={cn(errors.nombre && "border-destructive")} autoFocus />
          </FormField>
          <Button type="button" size="sm" onClick={handleSubmit(onSubmit)}>
            <Save className="w-3.5 h-3.5 mr-1" />{editando ? "Guardar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cerrar}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{especialidades.length} especialidades</p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}><Plus className="w-4 h-4 mr-1.5" />Nueva Especialidad</Button>
        )}
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
        <DataTable columns={columns} data={especialidades} searchPlaceholder="Buscar especialidades..." onRowClick={abrirEditar} emptyMessage="No hay especialidades." pageSize={20} />
      </div>
    </div>
  );
}
