import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, X, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { useToast } from "@/store/toastStore";
import type { Proveedor } from "@/db/types";
import { getProveedores, createProveedor, updateProveedor, toggleProveedorEstado } from "@/db/queries/catalogos";
import { cn } from "@/lib/utils";

const schema = z.object({
  nit: z.string().min(1, "NIT/Cédula requerida"),
  nombre: z.string().min(1, "Nombre requerido"),
  telefono: z.string().optional(),
  ciudad: z.string().optional(),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  estado: z.enum(["A", "I"]),
});
type FormValues = z.infer<typeof schema>;

export function ProveedoresTab() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => setProveedores(await getProveedores(false)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: "A" },
  });

  const abrirNuevo = () => { reset({ estado: "A" }); setEditando(null); setMostrarForm(true); };
  const abrirEditar = (p: Proveedor) => {
    reset({ nit: p.nit, nombre: p.nombre, telefono: p.telefono ?? "", ciudad: p.ciudad ?? "", direccion: p.direccion ?? "", contacto: p.contacto ?? "", email: p.email ?? "", estado: p.estado });
    setEditando(p);
    setMostrarForm(true);
  };
  const cerrar = () => { setMostrarForm(false); setEditando(null); reset(); };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editando) {
        await updateProveedor(editando.id, { nombre: data.nombre, telefono: data.telefono || null, ciudad: data.ciudad || null, direccion: data.direccion || null, contacto: data.contacto || null, email: data.email || null, estado: data.estado });
        success("Proveedor actualizado");
      } else {
        await createProveedor({ nit: data.nit, nombre: data.nombre, telefono: data.telefono || null, ciudad: data.ciudad || null, direccion: data.direccion || null, contacto: data.contacto || null, email: data.email || null, estado: data.estado });
        success("Proveedor creado");
      }
      cerrar();
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const handleToggle = async (p: Proveedor) => {
    try {
      await toggleProveedorEstado(p.id, p.estado === "A" ? "I" : "A");
      success(p.estado === "A" ? "Proveedor inactivado" : "Proveedor activado");
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const columns: ColumnDef<Proveedor>[] = [
    { accessorKey: "nit", header: "NIT/Cédula", size: 110, cell: ({ getValue }) => <span className="font-mono text-sm">{getValue<string>()}</span> },
    {
      accessorKey: "nombre", header: "Nombre",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.nombre}</p>
          {row.original.contacto && <p className="text-xs text-slate-400">{row.original.contacto}</p>}
        </div>
      ),
    },
    { accessorKey: "telefono", header: "Teléfono", size: 110, cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span> },
    { accessorKey: "ciudad", header: "Ciudad", size: 100, cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span> },
    {
      accessorKey: "estado", header: "Estado", size: 90,
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
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleToggle(row.original); }}>
            {row.original.estado === "A" ? <ToggleRight className="w-3.5 h-3.5 text-green-500" /> : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />}
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
              {editando ? `Editar: ${editando.nombre}` : "Nuevo Proveedor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <FormField label="NIT / Cédula" required error={errors.nit?.message} htmlFor="prov-nit">
                  <Input id="prov-nit" {...register("nit")} disabled={!!editando} className={cn(errors.nit && "border-destructive")} />
                </FormField>
                <FormField label="Nombre / Razón Social" required error={errors.nombre?.message} htmlFor="prov-nom" className="col-span-2">
                  <Input id="prov-nom" {...register("nombre")} className={cn(errors.nombre && "border-destructive")} />
                </FormField>
                <FormField label="Ciudad" htmlFor="prov-ciu">
                  <Input id="prov-ciu" {...register("ciudad")} placeholder="PALMIRA" />
                </FormField>
                <FormField label="Teléfono" htmlFor="prov-tel">
                  <Input id="prov-tel" {...register("telefono")} />
                </FormField>
                <FormField label="Contacto" htmlFor="prov-con">
                  <Input id="prov-con" {...register("contacto")} placeholder="Nombre del contacto" />
                </FormField>
                <FormField label="Email" error={errors.email?.message} htmlFor="prov-ema">
                  <Input id="prov-ema" type="email" {...register("email")} className={cn(errors.email && "border-destructive")} />
                </FormField>
                <FormField label="Dirección" htmlFor="prov-dir" className="col-span-2">
                  <Input id="prov-dir" {...register("direccion")} />
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
        <p className="text-sm text-slate-500">{proveedores.filter(p => p.estado === "A").length} proveedores activos</p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}><Plus className="w-4 h-4 mr-1.5" />Nuevo Proveedor</Button>
        )}
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
        <DataTable columns={columns} data={proveedores} searchPlaceholder="Buscar proveedores..." onRowClick={abrirEditar} emptyMessage="No hay proveedores." pageSize={15} />
      </div>
    </div>
  );
}
