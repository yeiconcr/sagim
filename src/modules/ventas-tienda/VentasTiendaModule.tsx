/**
 * Módulo Ventas Tienda — POS de artículos del inventario.
 * Equivalente al Tab "Tienda" de frmIngresos en VB6. Task 11.
 */
import { useState, useEffect, useCallback } from "react";
import { Plus, Ban, Store, DollarSign, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import type { FactuTienda } from "@/db/types";
import { getFacturasTienda, anularFacturaTienda } from "@/db/queries/ventas";
import { formatDate, formatCurrency, today } from "@/lib/utils";
import { NuevaFacturaForm } from "./NuevaFacturaForm";

type Vista = "lista" | "nuevo";

export function VentasTiendaModule() {
  const [vista, setVista] = useState<Vista>("lista");
  const [refetchKey, setRefetchKey] = useState(0);
  const { clientePrecargado, setClientePrecargado } = useAppStore();

  useEffect(() => {
    if (clientePrecargado) setVista("nuevo");
  }, [clientePrecargado]);

  if (vista === "nuevo") {
    return (
      <NuevaFacturaForm
        cedulaInicial={clientePrecargado ?? undefined}
        onGuardar={() => { setClientePrecargado(null); setRefetchKey((k) => k + 1); setVista("lista"); }}
        onCancelar={() => { setClientePrecargado(null); setVista("lista"); }}
      />
    );
  }

  return (
    <FacturasLista
      refetchKey={refetchKey}
      onNuevo={() => setVista("nuevo")}
      onRefetch={() => setRefetchKey((k) => k + 1)}
    />
  );
}

// =============================================
// LISTA DE FACTURAS TIENDA
// =============================================
interface ListaProps { refetchKey: number; onNuevo: () => void; onRefetch: () => void; }

function FacturasLista({ refetchKey, onNuevo, onRefetch }: ListaProps) {
  const [facturas, setFacturas] = useState<FactuTienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "A" | "X">("A");
  const [filtroFecha, setFiltroFecha] = useState(today());
  const [confirmAnular, setConfirmAnular] = useState<FactuTienda | null>(null);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFacturasTienda({ pageSize: 200, estado: filtroEstado, fechaDesde: filtroFecha, fechaHasta: filtroFecha });
      setFacturas(result.data);
    } catch (err) {
      error("Error", String(err));
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroFecha, error]);

  useEffect(() => { cargar(); }, [cargar, refetchKey]);

  const handleAnular = async () => {
    if (!confirmAnular) return;
    try {
      await anularFacturaTienda(confirmAnular.nro_docu, confirmAnular.total, confirmAnular.cedula ?? "", usuario?.nombre ?? "sistema");
      success("Factura anulada", `Factura N° ${confirmAnular.nro_docu} anulada. Stock revertido.`);
      onRefetch();
    } catch (err) {
      error("Error al anular", String(err));
    } finally {
      setConfirmAnular(null);
    }
  };

  const totalDia = facturas.filter(f => f.estado === "A").reduce((s, f) => s + f.total, 0);
  const cantidadDia = facturas.filter(f => f.estado === "A").length;

  const columns: ColumnDef<FactuTienda>[] = [
    { accessorKey: "nro_docu", header: "N° Factura", size: 100, cell: ({ getValue }) => <span className="font-mono font-bold text-sm">{String(getValue<number>()).padStart(6, "0")}</span> },
    { accessorKey: "fecha", header: "Fecha", size: 100, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
    { accessorKey: "nombre_cliente", header: "Cliente", cell: ({ row }) => <div><p className="font-medium text-sm">{row.original.nombre_cliente || "—"}</p><p className="text-xs text-slate-400">{row.original.cedula}</p></div> },
    { accessorKey: "nombre_forma_pago", header: "Forma Pago", size: 110, cell: ({ row }) => <div><p className="text-sm">{row.original.nombre_forma_pago || "—"}</p>{row.original.plazo > 0 && <p className="text-xs text-slate-400">{row.original.plazo} días</p>}</div> },
    { accessorKey: "subtotal", header: "Subtotal", size: 110, cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "iva", header: "IVA", size: 90, cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "total", header: "Total", size: 120, cell: ({ getValue }) => <span className="font-bold text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    {
      accessorKey: "estado", header: "Estado", size: 90,
      cell: ({ getValue }) => getValue<string>() === "A"
        ? <div className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-700 font-medium">VIGENTE</span></div>
        : <div className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-700 font-medium">ANULADA</span></div>,
    },
    {
      id: "acciones", header: "", size: 60,
      cell: ({ row }) => row.original.estado === "A" ? (
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Anular" onClick={(e) => { e.stopPropagation(); setConfirmAnular(row.original); }}>
          <Ban className="w-3.5 h-3.5 text-red-500" />
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <PageHeader
        title="Ventas Tienda"
        description="Punto de venta de artículos del inventario"
        actions={<Button onClick={onNuevo} size="sm"><Plus className="w-4 h-4 mr-1.5" />Nueva Factura</Button>}
      />

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><Store className="w-8 h-8 text-orange-500" /><div><p className="text-xs text-slate-500">Facturas del día</p><p className="text-xl font-black text-slate-800">{cantidadDia}</p></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><DollarSign className="w-8 h-8 text-green-500" /><div><p className="text-xs text-slate-500">Total vendido</p><p className="text-xl font-black text-slate-800">{formatCurrency(totalDia)}</p></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Fecha:</label>
          <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="h-8 px-2 text-sm border border-input rounded-md bg-background" />
        </div>
        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as "todos" | "A" | "X")}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Solo vigentes</SelectItem>
            <SelectItem value="X">Solo anuladas</SelectItem>
            <SelectItem value="todos">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" onClick={cargar}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Actualizar</Button>
      </div>

      {loading ? <PageLoading text="Cargando facturas..." /> : (
        <DataTable columns={columns} data={facturas} searchPlaceholder="Buscar por cliente..." emptyMessage="No hay facturas para los filtros seleccionados." pageSize={20} showSearch={facturas.length > 10} />
      )}

      <ConfirmDialog
        open={!!confirmAnular}
        onOpenChange={(o) => !o && setConfirmAnular(null)}
        title="¿Anular factura?"
        description={`Se anulará la Factura N° ${confirmAnular?.nro_docu} de ${confirmAnular?.nombre_cliente} por ${formatCurrency(confirmAnular?.total ?? 0)}. Se revertirá el stock de todos los artículos. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, anular"
        variant="destructive"
        onConfirm={handleAnular}
      />
    </div>
  );
}
