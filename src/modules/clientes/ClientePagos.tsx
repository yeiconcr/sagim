/**
 * ClientePagos — vista de historial de pagos de un cliente.
 * Equivalente a frmConpagos del VB6.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Calendar, DollarSign } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import type { Cliente, PagoCli } from "@/db/types";
import { getPagosByInscripcion } from "@/db/queries/clientes";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Props {
  cliente: Cliente;
  onVolver: () => void;
}

export function ClientePagos({ cliente, onVolver }: Props) {
  const [pagos, setPagos] = useState<PagoCli[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPagosByInscripcion(cliente.inscripcion)
      .then(setPagos)
      .finally(() => setLoading(false));
  }, [cliente.inscripcion]);

  // Resumen
  const totalPagado = pagos.filter((p) => p.estado === "A").reduce((sum, p) => sum + p.valor, 0);
  const totalPagos = pagos.filter((p) => p.estado === "A").length;
  const ultimoPago = pagos.filter((p) => p.estado === "A")[0];

  const columns: ColumnDef<PagoCli>[] = [
    {
      accessorKey: "fecha_pag",
      header: "Fecha",
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: "nombre_actividad",
      header: "Actividad / Servicio",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium leading-tight">{row.original.nombre_actividad || row.original.id_actividad || "—"}</p>
          {row.original.periodicidad && (
            <p className="text-xs text-slate-400">{row.original.periodicidad === "M" ? "Mensual" : "Única vez"}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "valor",
      header: "Valor",
      size: 120,
      cell: ({ getValue }) => (
        <span className="font-semibold text-sm tabular-nums">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      size: 90,
      cell: ({ getValue }) => {
        const e = getValue<string>();
        return (
          <Badge variant={e === "A" ? "success" : "destructive"} className="text-xs">
            {e === "A" ? "VIGENTE" : "ANULADO"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "observaciones",
      header: "Observaciones",
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500 truncate max-w-[200px] block">
          {getValue<string>() || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onVolver} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Historial de Pagos
          </h1>
          <p className="text-sm text-slate-500">
            {cliente.nombres} {cliente.apellidos} — Inscripción #{cliente.inscripcion}
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total pagos</p>
              <p className="text-xl font-black text-slate-800">{totalPagos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total pagado</p>
              <p className="text-lg font-black text-slate-800">{formatCurrency(totalPagado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Último pago</p>
              <p className="text-sm font-semibold text-slate-800">
                {ultimoPago ? formatDate(ultimoPago.fecha_pag) : "Sin pagos"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      {loading ? (
        <PageLoading text="Cargando pagos..." />
      ) : (
        <div style={{ height: "400px" }}>
          <DataTable
            columns={columns}
            data={pagos}
            searchPlaceholder="Buscar en pagos..."
            emptyMessage="Este cliente no tiene pagos registrados."
            pageSize={15}
            showSearch={pagos.length > 10}
          />
        </div>
      )}
    </div>
  );
}
