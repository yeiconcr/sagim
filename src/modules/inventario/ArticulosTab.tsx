import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, X, Save, BarChart2, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import type { Inventario, Kardex, Proveedor } from "@/db/types";
import { getInventario, createArticulo, updateArticulo, toggleArticuloEstado, getKardexByArticulo } from "@/db/queries/inventario";
import { getProveedores } from "@/db/queries/catalogos";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const schema = z.object({
  codigo: z.string().min(1, "Código requerido").max(20),
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().optional(),
  stock: z.coerce.number().min(0),
  unidad_medida: z.string().min(1),
  precio_compra: z.coerce.number().min(0),
  ganancia: z.coerce.number().min(0).max(1000),
  impuesto: z.coerce.number().min(0).max(100),
  ubicacion: z.string().optional(),
  id_proveedor: z.coerce.number().optional(),
  estado: z.enum(["A", "I"]),
});
type FormValues = z.infer<typeof schema>;

type Vista = "lista" | "kardex";

export function ArticulosTab() {
  const [articulos, setArticulos] = useState<Inventario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editando, setEditando] = useState<Inventario | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [vista, setVista] = useState<Vista>("lista");
  const [articuloKardex, setArticuloKardex] = useState<Inventario | null>(null);
  const [kardex, setKardex] = useState<Kardex[]>([]);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, prov] = await Promise.all([getInventario({ pageSize: 500 }), getProveedores()]);
      setArticulos(inv.data);
      setProveedores(prov);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: "A", stock: 0, ganancia: 0, impuesto: 0, precio_compra: 0, unidad_medida: "UND" },
  });

  const watchPrecioCompra = watch("precio_compra") || 0;
  const watchGanancia = watch("ganancia") || 0;
  const precioVentaCalculado = Number(watchPrecioCompra) * (1 + Number(watchGanancia) / 100);

  const abrirNuevo = () => {
    reset({ estado: "A", stock: 0, ganancia: 0, impuesto: 0, precio_compra: 0, unidad_medida: "UND" });
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (art: Inventario) => {
    reset({
      codigo: art.codigo, nombre: art.nombre, descripcion: art.descripcion ?? "",
      stock: art.stock, unidad_medida: art.unidad_medida ?? "UND",
      precio_compra: art.precio_compra, ganancia: art.ganancia, impuesto: art.impuesto,
      ubicacion: art.ubicacion ?? "", id_proveedor: art.id_proveedor ?? undefined,
      estado: art.estado,
    });
    setEditando(art);
    setMostrarForm(true);
  };

  const verKardex = async (art: Inventario) => {
    setArticuloKardex(art);
    setLoadingKardex(true);
    setVista("kardex");
    try {
      setKardex(await getKardexByArticulo(art.codigo));
    } catch (err) {
      error("Error", String(err));
    } finally {
      setLoadingKardex(false);
    }
  };

  const cerrar = () => { setMostrarForm(false); setEditando(null); reset(); };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editando) {
        await updateArticulo(editando.codigo, {
          nombre: data.nombre, descripcion: data.descripcion || null,
          stock: data.stock, unidad_medida: data.unidad_medida,
          precio_compra: data.precio_compra, ganancia: data.ganancia, impuesto: data.impuesto,
          ubicacion: data.ubicacion || null, id_proveedor: data.id_proveedor || null,
          estado: data.estado,
        });
        success("Artículo actualizado");
      } else {
        await createArticulo({
          codigo: data.codigo, nombre: data.nombre, descripcion: data.descripcion || null,
          stock: data.stock, unidad_medida: data.unidad_medida,
          precio_compra: data.precio_compra, ganancia: data.ganancia, impuesto: data.impuesto,
          ubicacion: data.ubicacion || null, id_proveedor: data.id_proveedor || null,
          estado: data.estado,
        });
        success("Artículo creado");
      }
      cerrar();
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  const handleToggle = async (art: Inventario) => {
    try {
      await toggleArticuloEstado(art.codigo, art.estado === "A" ? "I" : "A");
      success(art.estado === "A" ? "Artículo inactivado" : "Artículo activado");
      cargar();
    } catch (err) {
      error("Error", String(err));
    }
  };

  // VISTA KARDEX
  if (vista === "kardex" && articuloKardex) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setVista("lista"); setArticuloKardex(null); }}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />Volver
          </Button>
          <div>
            <h3 className="font-semibold text-slate-800">Kárdex: {articuloKardex.nombre}</h3>
            <p className="text-xs text-slate-500">Código: {articuloKardex.codigo} · Stock actual: <strong>{articuloKardex.stock} {articuloKardex.unidad_medida}</strong></p>
          </div>
        </div>

        {loadingKardex ? <PageLoading text="Cargando kárdex..." /> : (
          <div className="flex-1" style={{ minHeight: 0 }}>
            <DataTable
              columns={[
                { accessorKey: "fecha", header: "Fecha", size: 100, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
                { accessorKey: "detalle", header: "Detalle", cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span> },
                { accessorKey: "cantidad_in", header: "Cant. Entrada", size: 110, cell: ({ getValue }) => { const v = getValue<number>(); return <span className={cn("text-sm tabular-nums text-right block", v > 0 && "text-green-600 font-medium")}>{v > 0 ? `+${v}` : "—"}</span>; } },
                { accessorKey: "total_in", header: "Valor Entrada", size: 120, cell: ({ getValue }) => { const v = getValue<number>(); return <span className={cn("text-sm tabular-nums text-right block", v > 0 && "text-green-600")}>{v > 0 ? formatCurrency(v) : "—"}</span>; } },
                { accessorKey: "cantidad_sa", header: "Cant. Salida", size: 110, cell: ({ getValue }) => { const v = getValue<number>(); return <span className={cn("text-sm tabular-nums text-right block", v > 0 && "text-red-500 font-medium")}>{v > 0 ? `-${v}` : "—"}</span>; } },
                { accessorKey: "total_sa", header: "Valor Salida", size: 120, cell: ({ getValue }) => { const v = getValue<number>(); return <span className={cn("text-sm tabular-nums text-right block", v > 0 && "text-red-500")}>{v > 0 ? formatCurrency(v) : "—"}</span>; } },
                { accessorKey: "saldo", header: "Saldo", size: 90, cell: ({ getValue }) => <span className="text-sm font-semibold tabular-nums text-right block">{getValue<number>() ?? "—"}</span> },
              ] satisfies ColumnDef<Kardex>[]}
              data={kardex}
              showSearch={false}
              emptyMessage="Sin movimientos en el kárdex."
              pageSize={20}
            />
          </div>
        )}
      </div>
    );
  }

  // VISTA LISTA
  const columns: ColumnDef<Inventario>[] = [
    { accessorKey: "codigo", header: "Código", size: 90, cell: ({ getValue }) => <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{getValue<string>()}</span> },
    {
      accessorKey: "nombre", header: "Artículo",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.nombre}</p>
          {row.original.descripcion && <p className="text-xs text-slate-400 truncate max-w-[200px]">{row.original.descripcion}</p>}
        </div>
      ),
    },
    { accessorKey: "stock", header: "Stock", size: 80, cell: ({ row }) => <span className={cn("text-base font-bold tabular-nums", row.original.stock <= 0 && "text-red-500")}>{row.original.stock}</span> },
    { accessorKey: "unidad_medida", header: "Und.", size: 70, cell: ({ getValue }) => <Badge variant="outline" className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-50">{getValue<string>()}</Badge> },
    { accessorKey: "precio_compra", header: "P. Compra", size: 110, cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    {
      id: "precio_venta", header: "P. Venta", size: 110,
      cell: ({ row }) => {
        const pv = row.original.precio_compra * (1 + row.original.ganancia / 100);
        return <span className="text-sm font-semibold tabular-nums text-green-700">{formatCurrency(pv)}</span>;
      },
    },
    {
      accessorKey: "estado", header: "Estado", size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === "A" ? "success" : "secondary"} className="text-xs">
          {getValue<string>() === "A" ? "ACTIVO" : "INACTIVO"}
        </Badge>
      ),
    },
    {
      id: "acciones", header: "", size: 110,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver Kárdex" onClick={(e) => { e.stopPropagation(); verKardex(row.original); }}>
            <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
          </Button>
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
              {editando ? `Editar: ${editando.nombre}` : "Nuevo Artículo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <FormField label="Código" required error={errors.codigo?.message} htmlFor="art-cod">
                  <Input id="art-cod" {...register("codigo")} disabled={!!editando} className={cn(errors.codigo && "border-destructive")} />
                </FormField>
                <FormField label="Nombre" required error={errors.nombre?.message} htmlFor="art-nom" className="col-span-2">
                  <Input id="art-nom" {...register("nombre")} className={cn(errors.nombre && "border-destructive")} />
                </FormField>
                <FormField label="Estado">
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
                <FormField label="Stock inicial" htmlFor="art-sto">
                  <Input id="art-sto" type="number" step="0.01" min="0" {...register("stock")} />
                </FormField>
                <FormField label="Unidad de medida">
                  <Controller name="unidad_medida" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UND">Unidad (UND)</SelectItem>
                        <SelectItem value="KG">Kilogramo (KG)</SelectItem>
                        <SelectItem value="LT">Litro (LT)</SelectItem>
                        <SelectItem value="M">Metro (M)</SelectItem>
                        <SelectItem value="PAQ">Paquete (PAQ)</SelectItem>
                        <SelectItem value="CJA">Caja (CJA)</SelectItem>
                        <SelectItem value="SRV">Servicio (SRV)</SelectItem>
                        <SelectItem value="MENS">Mensualidad (MENS)</SelectItem>
                        <SelectItem value="OTRA">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Precio compra $" required error={errors.precio_compra?.message} htmlFor="art-pco">
                  <Input id="art-pco" type="number" step="0.01" min="0" {...register("precio_compra")} className={cn(errors.precio_compra && "border-destructive")} />
                </FormField>
                <FormField label="% Ganancia" htmlFor="art-gan">
                  <Input id="art-gan" type="number" step="0.01" min="0" {...register("ganancia")} />
                </FormField>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">P. Venta (Calculado)</label>
                  <div className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm items-center font-bold text-green-700 shadow-sm">
                    {formatCurrency(precioVentaCalculado)}
                  </div>
                </div>
                <FormField label="% IVA" htmlFor="art-iva">
                  <Input id="art-iva" type="number" step="0.01" min="0" max="100" {...register("impuesto")} />
                </FormField>
                <FormField label="Proveedor">
                  <Controller name="id_proveedor" control={control} render={({ field }) => (
                    <Select value={field.value?.toString() ?? ""} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                      <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                      <SelectContent>
                        {proveedores.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Ubicación" htmlFor="art-ubi">
                  <Input id="art-ubi" {...register("ubicacion")} placeholder="Estante, bodega..." />
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
        <p className="text-sm text-slate-500">
          {articulos.filter(a => a.estado === "A").length} artículos activos ·{" "}
          {articulos.filter(a => a.stock <= 0 && a.estado === "A").length} sin stock
        </p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}><Plus className="w-4 h-4 mr-1.5" />Nuevo Artículo</Button>
        )}
      </div>

      {loading ? <PageLoading text="Cargando inventario..." /> : (
        <div className="flex-1" style={{ minHeight: 0 }}>
          <DataTable columns={columns} data={articulos} searchPlaceholder="Buscar artículos..." onRowClick={abrirEditar} emptyMessage="No hay artículos en el inventario." pageSize={20} />
        </div>
      )}
    </div>
  );
}
