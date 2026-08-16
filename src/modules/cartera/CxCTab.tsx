/**
 * Cuentas por Cobrar — movimientos de cartera por cliente.
 * Tipos: IN=Saldo Inicial, AB=Abono, NC=Nota Crédito, ND=Nota Débito, FA=Factura, AN=Anulación.
 */
import { useState, useCallback } from "react";
import { Search, Plus, X } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import { getCtasPorCobrar, getSaldoCliente, registrarMovCtaCobrar, getCuotasByCliente, pagarCuota } from "@/db/queries/caja";
import { getDb } from "@/db/database";
import { formatDate, formatCurrency, today } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type TipoMov = "AB" | "NC" | "ND";

const TIPO_LABELS: Record<string, string> = {
  IN: "Saldo Inicial", AB: "Abono", NC: "Nota Crédito",
  ND: "Nota Débito", FA: "Factura Tienda", AN: "Anulación",
};
const TIPO_COLORS: Record<string, string> = {
  IN: "text-blue-600", AB: "text-green-600", NC: "text-green-500",
  ND: "text-orange-500", FA: "text-purple-600", AN: "text-red-500",
};

interface MovCxC {
  id: number;
  num_mov: number;
  num_docu: string | null;
  id_tipomo: string;
  fecha_doc: string;
  concemo: string | null;
  importe: number;
  pago_clien: number;
  diferencia: number;
  saldo_clien: number;
}

interface Cuota {
  id: number;
  num_doc: string | null;
  nro_cuota: number;
  vencim: string | null;
  importe_total: number;
  pagado: number;
  estado: string;
}

export function CxCTab() {
  const [cedula, setCedula] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [movimientos, setMovimientos] = useState<MovCxC[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mostrarMov, setMostrarMov] = useState(false);
  const [tipoMov, setTipoMov] = useState<TipoMov>("AB");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmPagar, setConfirmPagar] = useState<Cuota | null>(null);
  const [valorPago, setValorPago] = useState("");
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const buscarCliente = async () => {
    if (!cedula.trim()) return;
    setLoading(true);
    try {
      const db = await getDb();
      const rows = await db.select<{ nombres: string; apellidos: string }[]>(
        "SELECT nombres, apellidos FROM clientes WHERE cedula = $1 LIMIT 1", [cedula]
      );
      if (rows.length === 0) { error("No encontrado", `No existe cliente con cédula ${cedula}`); return; }
      setNombreCliente(`${rows[0].nombres} ${rows[0].apellidos}`);
      const [movs, s, cus] = await Promise.all([
        getCtasPorCobrar(cedula),
        getSaldoCliente(cedula),
        getCuotasByCliente(cedula),
      ]);
      setMovimientos(movs as MovCxC[]);
      setSaldo(s);
      setCuotas(cus as Cuota[]);
    } catch (err) {
      error("Error", String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarMov = async () => {
    const val = Number(importe);
    if (!concepto.trim()) { error("Falta concepto", "Ingrese una descripción."); return; }
    if (isNaN(val) || val <= 0) { error("Valor inválido", "El importe debe ser mayor a cero."); return; }
    setGuardando(true);
    try {
      await registrarMovCtaCobrar({ cedula, idTipomo: tipoMov, concepto, importe: val, usuario: usuario?.nombre ?? "sistema" });
      success("Movimiento registrado");
      setMostrarMov(false);
      setConcepto(""); setImporte("");
      await buscarCliente();
    } catch (err) {
      error("Error", String(err));
    } finally {
      setGuardando(false);
    }
  };

  const handlePagarCuota = async () => {
    if (!confirmPagar) return;
    const val = Number(valorPago);
    if (isNaN(val) || val <= 0) { error("Valor inválido", "El valor de pago debe ser mayor a cero."); return; }
    try {
      await pagarCuota(confirmPagar.id, val, usuario?.nombre ?? "sistema");
      success("Cuota pagada");
      await buscarCliente();
    } catch (err) {
      error("Error", String(err));
    } finally {
      setConfirmPagar(null); setValorPago("");
    }
  };

  const colsMov: ColumnDef<MovCxC>[] = [
    { accessorKey: "num_mov", header: "#", size: 50, cell: ({ getValue }) => <span className="text-xs text-slate-400">{getValue<number>()}</span> },
    { accessorKey: "fecha_doc", header: "Fecha", size: 100, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
    {
      accessorKey: "id_tipomo", header: "Tipo", size: 110,
      cell: ({ getValue }) => <span className={cn("text-xs font-semibold", TIPO_COLORS[getValue<string>()] ?? "text-slate-600")}>{TIPO_LABELS[getValue<string>()] ?? getValue<string>()}</span>,
    },
    { accessorKey: "concemo", header: "Concepto", cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span> },
    { accessorKey: "importe", header: "Cargo", size: 110, cell: ({ getValue }) => { const v = getValue<number>(); return <span className={cn("text-sm tabular-nums", v > 0 && "text-red-600 font-medium")}>{v > 0 ? formatCurrency(v) : "—"}</span>; } },
    { accessorKey: "pago_clien", header: "Abono", size: 110, cell: ({ getValue }) => { const v = getValue<number>(); return <span className={cn("text-sm tabular-nums", v > 0 && "text-green-600 font-medium")}>{v > 0 ? formatCurrency(v) : "—"}</span>; } },
    { accessorKey: "saldo_clien", header: "Saldo", size: 120, cell: ({ getValue }) => <span className="text-sm font-bold tabular-nums">{formatCurrency(getValue<number>())}</span> },
  ];

  const colsCuotas: ColumnDef<Cuota>[] = [
    { accessorKey: "nro_cuota", header: "Cuota", size: 70, cell: ({ getValue }) => <span className="font-bold text-sm">{getValue<number>()}</span> },
    { accessorKey: "num_doc", header: "Documento", size: 110, cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>() || "—"}</span> },
    { accessorKey: "vencim", header: "Vencimiento", size: 110, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
    { accessorKey: "importe_total", header: "Valor cuota", size: 110, cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "pagado", header: "Pagado", size: 100, cell: ({ getValue }) => <span className="text-sm tabular-nums text-green-600">{formatCurrency(getValue<number>())}</span> },
    {
      accessorKey: "estado", header: "Estado", size: 90,
      cell: ({ getValue }) => {
        const e = getValue<string>();
        const v: Record<string, string> = { P: "success", C: "secondary", V: "destructive" };
        return <Badge variant={(v[e] ?? "outline") as "success" | "secondary" | "destructive" | "outline"} className="text-xs">{e === "P" ? "PENDIENTE" : e === "C" ? "PAGADA" : "VENCIDA"}</Badge>;
      },
    },
    {
      id: "pagar", header: "", size: 80,
      cell: ({ row }) => row.original.estado === "P" ? (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setValorPago(String(row.original.importe_total - row.original.pagado)); setConfirmPagar(row.original); }}>
          Pagar
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Buscador */}
      <div className="flex gap-2 items-end">
        <FormField label="Cédula del cliente" htmlFor="cxc-ced" className="flex-1 max-w-xs">
          <div className="flex gap-2">
            <Input id="cxc-ced" value={cedula} onChange={(e) => setCedula(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscarCliente()} placeholder="Cédula..." className="h-9" />
            <Button size="sm" className="h-9" onClick={buscarCliente} disabled={!cedula.trim() || loading}>
              <Search className="w-3.5 h-3.5" />
            </Button>
          </div>
        </FormField>
        {nombreCliente && (
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold text-slate-800">{nombreCliente}</p>
              <p className={cn("text-lg font-black tabular-nums", saldo > 0 ? "text-red-600" : "text-green-600")}>
                Saldo: {formatCurrency(saldo)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setMostrarMov(!mostrarMov)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Nuevo Movimiento
            </Button>
          </div>
        )}
      </div>

      {/* Form movimiento */}
      {mostrarMov && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField label="Tipo">
              <Select value={tipoMov} onValueChange={(v) => setTipoMov(v as TipoMov)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AB">Abono</SelectItem>
                  <SelectItem value="NC">Nota Crédito</SelectItem>
                  <SelectItem value="ND">Nota Débito</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Concepto" className="col-span-2">
              <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Descripción del movimiento..." className="h-9" />
            </FormField>
            <FormField label="Importe ($)">
              <Input type="number" min="0" step="1000" value={importe} onChange={(e) => setImporte(e.target.value)} className="h-9" />
            </FormField>
            <div className="col-span-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMostrarMov(false)}><X className="w-3.5 h-3.5 mr-1" />Cancelar</Button>
              <Button size="sm" onClick={handleRegistrarMov} disabled={guardando}>
                {guardando ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Registrar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <PageLoading text="Cargando cartera..." /> : nombreCliente ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Movimientos CxC */}
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-slate-700 text-sm">Movimientos de cartera</h3>
            <div style={{ height: "300px" }}>
              <DataTable columns={colsMov} data={movimientos} showSearch={false} emptyMessage="Sin movimientos." pageSize={10} />
            </div>
          </div>
          {/* Cuotas */}
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-slate-700 text-sm">Cuotas pendientes</h3>
            <div style={{ height: "300px" }}>
              <DataTable columns={colsCuotas} data={cuotas} showSearch={false} emptyMessage="Sin cuotas pendientes." pageSize={10} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
          Ingrese la cédula de un cliente para ver su cartera
        </div>
      )}

      {/* Dialog pagar cuota */}
      {confirmPagar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-slate-800">Pagar Cuota N° {confirmPagar.nro_cuota}</h3>
              <p className="text-sm text-slate-500">Saldo pendiente: <strong>{formatCurrency(confirmPagar.importe_total - confirmPagar.pagado)}</strong></p>
              <FormField label="Valor a pagar ($)">
                <Input type="number" min="0" step="1000" value={valorPago} onChange={(e) => setValorPago(e.target.value)} autoFocus />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setConfirmPagar(null); setValorPago(""); }}>Cancelar</Button>
                <Button size="sm" onClick={handlePagarCuota}>Registrar Pago</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
