/**
 * NuevaFacturaForm — formulario POS para venta de artículos de tienda.
 * Lógica: cliente → forma de pago → artículos → guardar → Kardex + Stock + Caja/CxC.
 */
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Save, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { SelectorCliente, type ClienteSeleccionado } from "@/components/shared/SelectorCliente";
import { useToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import type { Inventario, FormaPago } from "@/db/types";
import { getInventario } from "@/db/queries/inventario";
import { getFormasPago } from "@/db/queries/catalogos";
import { guardarFacturaTienda } from "@/db/queries/ventas";
import { numeroALetras } from "@/lib/numLetras";
import { formatCurrency, today } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ItemFactura {
  id: string;
  codigo: string;
  detalle: string;
  cantidad: number;
  punitario: number;
  descuento: number;
  impuesto: number;
  total: number;
  stockDisponible: number;
}

interface Props {
  cedulaInicial?: string;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function NuevaFacturaForm({ cedulaInicial, onGuardar, onCancelar }: Props) {
  const [cliente, setCliente] = useState<ClienteSeleccionado | null>(null);
  const [articulos, setArticulos] = useState<Inventario[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [items, setItems] = useState<ItemFactura[]>([]);
  const [fecha, setFecha] = useState(today());
  const [idFormaPago, setIdFormaPago] = useState<string>("");
  const [plazo, setPlazo] = useState(0);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<string>("");
  const [abonoInicial, setAbonoInicial] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  useEffect(() => {
    Promise.all([
      getInventario({ pageSize: 500, estado: "A" }),
      getFormasPago(true),
    ]).then(([inv, fps]) => {
      setArticulos(inv.data);
      setFormasPago(fps);
      if (fps.length > 0) {
        setIdFormaPago(String(fps[0].id));
        setPlazo(fps[0].plazo_dias);
      }
    });
  }, []);

  const handleFormaPagoChange = (id: string) => {
    setIdFormaPago(id);
    const fp = formasPago.find((f) => String(f.id) === id);
    setPlazo(fp?.plazo_dias ?? 0);
  };

  const agregarItem = () => {
    const art = articulos.find((a) => a.codigo === articuloSeleccionado);
    if (!art) return;
    if (art.stock <= 0) { error("Sin stock", `${art.nombre} no tiene stock disponible.`); return; }

    const punitario = art.precio_compra * (1 + art.ganancia / 100);
    const total = punitario;

    const nuevoItem: ItemFactura = {
      id: Date.now().toString(),
      codigo: art.codigo,
      detalle: art.nombre,
      cantidad: 1,
      punitario: Math.round(punitario),
      descuento: 0,
      impuesto: art.impuesto,
      total: Math.round(punitario),
      stockDisponible: art.stock,
    };
    setItems((prev) => [...prev, nuevoItem]);
    setArticuloSeleccionado("");
  };

  const actualizarItem = (id: string, campo: keyof ItemFactura, valor: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [campo]: valor };
        const base = updated.cantidad * updated.punitario;
        const desc = base * (updated.descuento / 100);
        const sinIva = base - desc;
        const iva = sinIva * (updated.impuesto / 100);
        updated.total = sinIva + iva;
        return updated;
      })
    );
  };

  const eliminarItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Cálculos
  const subtotal = items.reduce((s, i) => {
    const base = i.cantidad * i.punitario;
    const desc = base * (i.descuento / 100);
    return s + (base - desc);
  }, 0);
  const ivaTotal = items.reduce((s, i) => {
    const base = i.cantidad * i.punitario;
    const desc = base * (i.descuento / 100);
    return s + (base - desc) * (i.impuesto / 100);
  }, 0);
  const total = subtotal + ivaTotal;
  const totalLetras = numeroALetras(total);
  const esCredito = plazo > 0;

  const handleGuardar = async () => {
    if (!cliente) { error("Falta cliente", "Seleccione un cliente."); return; }
    if (items.length === 0) { error("Sin ítems", "Agregue al menos un artículo."); return; }
    if (!idFormaPago) { error("Forma de pago", "Seleccione una forma de pago."); return; }

    // Validar stock
    for (const item of items) {
      if (item.cantidad > item.stockDisponible) {
        error("Stock insuficiente", `${item.detalle}: solo hay ${item.stockDisponible} unidades disponibles.`);
        return;
      }
    }

    setGuardando(true);
    try {
      const hora = new Date().toLocaleTimeString("es-CO");
      const nroDocu = await guardarFacturaTienda({
        cedula: cliente.cedula,
        fecha,
        hora,
        idFormaPago: Number(idFormaPago),
        plazo,
        subtotal,
        iva: ivaTotal,
        total,
        valorLetras: totalLetras,
        items: items.map((i) => ({
          codigo: i.codigo,
          detalle: i.detalle,
          cantidad: i.cantidad,
          punitario: i.punitario,
          descuento: i.descuento,
          impuesto: i.impuesto,
          total: i.total,
        })),
        abonoInicial: esCredito ? abonoInicial : 0,
        usuario: usuario?.nombre ?? "sistema",
      });
      success("Factura guardada", `Factura N° ${String(nroDocu).padStart(6, "0")} registrada. Stock actualizado.`);
      onGuardar();
    } catch (err) {
      error("Error al guardar", String(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancelar} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Nueva Factura de Venta</h1>
          <p className="text-sm text-slate-500">Tienda — Artículos del inventario</p>
        </div>
      </div>

      {/* Cliente + Fecha + Forma de Pago */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600">Datos de la venta</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <FormField label="Cliente" required>
              <SelectorCliente value={cliente} onChange={setCliente} required autoFocus />
            </FormField>
          </div>
          <FormField label="Fecha" htmlFor="fac-fecha">
            <Input id="fac-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </FormField>
          <div className="space-y-2">
            <FormField label="Forma de pago">
              <Select value={idFormaPago} onValueChange={handleFormaPagoChange}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {formasPago.map((fp) => (
                    <SelectItem key={fp.id} value={String(fp.id)}>
                      {fp.detalle}
                      {fp.plazo_dias > 0 && <span className="text-xs text-slate-400 ml-1">({fp.plazo_dias} días)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {esCredito && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                Venta a crédito — {plazo} días. Se generarán cuotas mensuales.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Artículos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-600">Artículos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={articuloSeleccionado} onValueChange={setArticuloSeleccionado}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar artículo..." />
                </SelectTrigger>
                <SelectContent>
                  {articulos.map((a) => (
                    <SelectItem key={a.codigo} value={a.codigo} disabled={a.stock <= 0}>
                      <span className="font-mono text-xs mr-2 text-slate-400">{a.codigo}</span>
                      {a.nombre}
                      <span className="ml-2 text-xs text-slate-400">Stock: {a.stock} · {formatCurrency(a.precio_compra * (1 + a.ganancia / 100))}</span>
                      {a.stock <= 0 && <span className="ml-1 text-xs text-red-400">(SIN STOCK)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" className="h-9" onClick={agregarItem} disabled={!articuloSeleccionado}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Agregar
            </Button>
          </div>

          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">Artículo</th>
                    <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-16">Cant.</th>
                    <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-28">P. Unitario</th>
                    <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-20">Desc. %</th>
                    <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-20">IVA %</th>
                    <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-28">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className={cn("hover:bg-slate-50", item.cantidad > item.stockDisponible && "bg-red-50")}>
                      <td className="px-2 py-1.5">
                        <p className="font-medium">{item.detalle}</p>
                        <p className="text-xs text-slate-400">Stock: {item.stockDisponible}</p>
                        {item.cantidad > item.stockDisponible && (
                          <p className="text-xs text-red-500 font-medium">⚠ Excede stock disponible</p>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" min="1" step="1" value={item.cantidad} onChange={(e) => actualizarItem(item.id, "cantidad", Number(e.target.value))} className="h-7 text-right text-sm w-14" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" min="0" step="100" value={item.punitario} onChange={(e) => actualizarItem(item.id, "punitario", Number(e.target.value))} className="h-7 text-right text-sm w-28" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" min="0" max="100" step="1" value={item.descuento} onChange={(e) => actualizarItem(item.id, "descuento", Number(e.target.value))} className="h-7 text-right text-sm w-16" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" min="0" max="100" step="0.1" value={item.impuesto} onChange={(e) => actualizarItem(item.id, "impuesto", Number(e.target.value))} className="h-7 text-right text-sm w-16" />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(item.total)}</td>
                      <td className="px-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminarItem(item.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Agregue artículos a la factura
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totales */}
      {items.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {esCredito && (
                <div className="flex-1">
                  <FormField label="Abono inicial ($)" htmlFor="fac-abono" description="0 = sin abono. El resto se generará como cuotas mensuales.">
                    <Input id="fac-abono" type="number" min="0" max={total} step="1000" value={abonoInicial} onChange={(e) => setAbonoInicial(Number(e.target.value))} />
                  </FormField>
                </div>
              )}
              <div className="space-y-2 text-right min-w-[220px] ml-auto">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Subtotal sin IVA:</span>
                  <span className="text-sm tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">IVA:</span>
                  <span className="text-sm tabular-nums text-orange-600">{formatCurrency(ivaTotal)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-bold text-slate-800">TOTAL:</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">{formatCurrency(total)}</span>
                </div>
                {esCredito && abonoInicial > 0 && (
                  <div className="flex justify-between items-center text-amber-700">
                    <span className="text-sm">Saldo a cuotas:</span>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(total - abonoInicial)}</span>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-500 italic text-left">
                  {totalLetras}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancelar}><X className="w-4 h-4 mr-1.5" />Cancelar</Button>
        <Button type="button" onClick={handleGuardar} disabled={guardando || !cliente || items.length === 0 || !idFormaPago} className="min-w-[140px]">
          {guardando
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
            : <><Save className="w-4 h-4 mr-1.5" />Guardar Factura</>
          }
        </Button>
      </div>
    </div>
  );
}
