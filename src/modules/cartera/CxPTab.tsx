/**
 * Cuentas por Pagar — deudas con proveedores.
 */
import { useState, useEffect, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { InputDialog } from "@/components/shared/InputDialog";
import { useToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import type { CtaPorPagar } from "@/db/types";
import { getCtasPorPagar, abonarCtaPorPagar } from "@/db/queries/compras";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function CxPTab() {
  const [cuentas, setCuentas] = useState<CtaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [abonar, setAbonar] = useState<CtaPorPagar | null>(null);
  const [valorAbono, setValorAbono] = useState("");
  const [abonando, setAbonando] = useState(false);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setCuentas(await getCtasPorPagar(soloPendientes));
    } catch (err) {
      error("Error", String(err));
    } finally {
      setLoading(false);
    }
  }, [soloPendientes, error]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAbonar = async (valorStr: string) => {
    if (!abonar) return;
    const val = Number(valorStr);
    if (isNaN(val) || val <= 0) { error("Valor inválido", "El abono debe ser mayor a cero."); return; }
    setAbonando(true);
    try {
      await abonarCtaPorPagar(abonar.id, val, usuario?.nombre ?? "sistema");
      success("Abono registrado", `Abono de ${formatCurrency(val)} a ${abonar.nombre_proveedor}`);
      setAbonar(null);
      setValorAbono("");
      cargar();
    } catch (err) {
      error("Error", String(err));
    } finally {
      setAbonando(false);
    }
  };

  const totalPendiente = cuentas.filter(c => c.estado === "P").reduce((s, c) => s + c.saldo, 0);

  const columns: ColumnDef<CtaPorPagar>[] = [
    { accessorKey: "nombre_proveedor", header: "Proveedor", size: 200, cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span> },
    { accessorKey: "fecha_doc", header: "Fecha", size: 100, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
    { accessorKey: "fecha_ven", header: "Vence", size: 100, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
    { accessorKey: "importe", header: "Total", size: 110, cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "pagado", header: "Pagado", size: 110, cell: ({ getValue }) => <span className="text-sm tabular-nums text-green-600">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "saldo", header: "Saldo", size: 110, cell: ({ getValue }) => <span className={cn("text-sm tabular-nums", getValue<number>() > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "estado", header: "Estado", size: 90, cell: ({ getValue }) => <Badge variant={getValue<string>() === "P" ? "warning" : "secondary"} className="text-xs">{getValue<string>() === "P" ? "PENDIENTE" : "CANCELADA"}</Badge> },
    { id: "abonar", header: "", size: 80, cell: ({ row }) => row.original.estado === "P" ? <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setValorAbono(String(row.original.saldo)); setAbonar(row.original); }}>Abonar</Button> : null },
  ];

  return (
    <div className="flex flex-col gap-4 min-h-fit">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Total pendiente con proveedores:</p>
          <p className="text-xl font-black text-red-600 tabular-nums">{formatCurrency(totalPendiente)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSoloPendientes(!soloPendientes)}>
          {soloPendientes ? "Ver todas" : "Solo pendientes"}
        </Button>
      </div>

      {loading ? <PageLoading text="Cargando cuentas por pagar..." /> : (
        <DataTable columns={columns} data={cuentas} searchPlaceholder="Buscar proveedor..." emptyMessage="No hay cuentas por pagar." pageSize={500} />
      )}

      {/* Dialog abonar */}
      <InputDialog
        open={!!abonar}
        onOpenChange={(open) => { if (!open) { setAbonar(null); setValorAbono(""); } }}
        title={`Abonar a ${abonar?.nombre_proveedor ?? ""}`}
        description={abonar ? `Saldo pendiente: ${formatCurrency(abonar.saldo)}` : ""}
        inputLabel="Valor a abonar ($)"
        initialValue={valorAbono}
        min={0}
        max={abonar?.saldo}
        confirmLabel="Registrar Abono"
        onConfirm={handleAbonar}
        loading={abonando}
      />
    </div>
  );
}
