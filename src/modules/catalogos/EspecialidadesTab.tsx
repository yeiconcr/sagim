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
import { PAGE_SIZE } from "@/lib/constants";
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
    { accessorKey: "nombre", header: "Especialidad", size: 200, cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span> },
    {
      accessorKey: "estado", header: "Estado", size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === "A" ? "success" : "secondary"} className="text-xs">
          {getValue<string>() === "A" ? "ACTIVA" : "INACTIVA"}
        </Badge>
      ),
    },
    {
      id: "acciones", header: "", size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); abrirEditar(row.original); }}>
            <Pencil className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] text-slate-600">Editar</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); handleToggle(row.original); }}>
            {row.original.estado === "A" ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
            <span className="text-[10px] text-slate-600">{row.original.estado === "A" ? "Inactivar" : "Activar"}</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex justify-between items-center flex-shrink-0">
        <p className="text-sm text-slate-500">{especialidades.length} especialidades</p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}><Plus className="w-4 h-4 mr-1.5" />Nueva Especialidad</Button>
        )}
      </div>
      {mostrarForm && (
        <div className="flex items-end gap-3 p-4 bg-white rounded-lg border flex-shrink-0">
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
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable columns={columns} data={especialidades} searchPlaceholder="Buscar especialidades..." onRowClick={abrirEditar} emptyMessage="No hay especialidades." pageSize={PAGE_SIZE.CATALOG} />
      </div>
    </div>
  );
}
