/**
 * NuevoReciboForm — formulario para crear un recibo de pago Gym.
 * Lógica: seleccionar cliente → agregar ítems (servicios) → guardar → genera PagosCli + MovCaja.
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Save, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { SelectorCliente, type ClienteSeleccionado } from '@/components/shared/SelectorCliente';
import { DatePicker } from '@/components/shared/DatePicker';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { Actividad, FormaPago } from '@/db/types';
import { getActividades, getFormasPago } from '@/db/queries/catalogos';
import { guardarReciboGym } from '@/db/queries/ventas';
import { numeroALetras } from '@/lib/numLetras';
import { formatCurrency, today } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ItemRecibo {
  id: string;
  codigo: string;
  detalle: string;
  cantidad: number;
  punitario: number;
  descuento: number;
  impuesto: number;
  total: number;
  periodicidad: 'M' | 'U';
}

interface Props {
  cedulaInicial?: string;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function NuevoReciboForm({ cedulaInicial, onGuardar, onCancelar }: Props) {
  const [cliente, setCliente] = useState<ClienteSeleccionado | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [idFormaPago, setIdFormaPago] = useState<string>('');
  const [items, setItems] = useState<ItemRecibo[]>([]);
  const [fecha, setFecha] = useState(today());
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState<string>('');
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  useEffect(() => {
    getActividades(true).then(setActividades);
    getFormasPago(true).then((fps) => {
      setFormasPago(fps);
      // Seleccionar "Efectivo" por defecto si existe
      const efectivo = fps.find((f) => f.detalle.toLowerCase().includes('efectivo'));
      if (efectivo) setIdFormaPago(String(efectivo.id));
    });
  }, []);

  // Si hay cédula precargada, buscar el cliente automáticamente
  useEffect(() => {
    if (cedulaInicial && !cliente) {
      // Simular búsqueda automática usando el SelectorCliente
      // El componente SelectorCliente lo manejará via autoFocus
    }
  }, [cedulaInicial, cliente]);

  const agregarItem = () => {
    const act = actividades.find((a) => a.codigo === actividadSeleccionada);
    if (!act) return;

    const punitario = act.tarifa;
    const total = punitario; // 1 unidad, sin descuento inicial

    const nuevoItem: ItemRecibo = {
      id: Date.now().toString(),
      codigo: act.codigo,
      detalle: act.nombre,
      cantidad: 1,
      punitario,
      descuento: 0,
      impuesto: act.impuesto,
      total,
      periodicidad: act.periodicidad,
    };
    setItems((prev) => [...prev, nuevoItem]);
    setActividadSeleccionada('');
  };

  const actualizarItem = (id: string, campo: keyof ItemRecibo, valor: number | string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [campo]: valor };
        // Recalcular total
        const base = updated.cantidad * updated.punitario;
        const desc = base * (updated.descuento / 100);
        updated.total = base - desc;
        return updated;
      })
    );
  };

  const eliminarItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal;
  const totalLetras = numeroALetras(total);

  const handleGuardar = async () => {
    if (!cliente) {
      error('Falta cliente', 'Debe seleccionar un cliente.');
      return;
    }
    if (items.length === 0) {
      error('Sin ítems', 'Agregue al menos un servicio.');
      return;
    }
    if (!idFormaPago) {
      error('Falta forma de pago', 'Seleccione la forma de pago.');
      return;
    }
    if (cliente.estado === 'I') {
      error(
        'Cliente inactivo',
        'El cliente está inactivo. Active el cliente antes de registrar el pago.'
      );
      return;
    }

    setGuardando(true);
    try {
      const hora = new Date().toLocaleTimeString('es-CO');
      const nroDocu = await guardarReciboGym({
        cedula: cliente.cedula,
        inscripcion: cliente.inscripcion,
        fecha,
        hora,
        idFormaPago: Number(idFormaPago),
        observaciones,
        valorLetras: totalLetras,
        items: items.map((i) => ({
          codigo: i.codigo,
          detalle: i.detalle,
          cantidad: i.cantidad,
          punitario: i.punitario,
          descuento: i.descuento,
          impuesto: i.impuesto,
          total: i.total,
          periodicidad: i.periodicidad,
        })),
        totalGeneral: total,
        usuario: usuario?.nombre ?? 'sistema',
      });
      success(
        'Recibo guardado',
        `Recibo N° ${String(nroDocu).padStart(6, '0')} registrado exitosamente.`
      );
      onGuardar();
    } catch (err) {
      error('Error al guardar', String(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto min-h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            title="Volver"
            onClick={onCancelar}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Nuevo Recibo de Pago</h1>
            <p className="text-sm text-slate-500">Gym — Membresías y Servicios</p>
          </div>
        </div>

        {/* Cliente + Fecha */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Datos del cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Cliente" required>
                <SelectorCliente
                  value={cliente}
                  onChange={setCliente}
                  required
                  autoFocus={!cedulaInicial}
                />
              </FormField>
            </div>
            <FormField label="Fecha del recibo">
              <DatePicker
                value={fecha}
                onChange={(v) => setFecha(v ?? today())}
                maxYear={new Date().getFullYear() + 1}
              />
            </FormField>
            <FormField label="Forma de pago" required>
              <Select value={idFormaPago} onValueChange={setIdFormaPago}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {formasPago.map((fp) => (
                    <SelectItem key={fp.id} value={String(fp.id)}>
                      {fp.detalle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {/* Ítems */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Servicios / Actividades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Selector de actividad */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={actividadSeleccionada} onValueChange={setActividadSeleccionada}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar actividad o servicio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {actividades.map((a) => (
                      <SelectItem key={a.codigo} value={a.codigo}>
                        <span className="font-mono text-xs mr-2 text-slate-400">{a.codigo}</span>
                        {a.nombre}
                        <span className="ml-2 text-slate-400 text-xs">
                          {formatCurrency(a.tarifa)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9"
                onClick={agregarItem}
                disabled={!actividadSeleccionada}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Agregar
              </Button>
            </div>

            {/* Tabla de ítems */}
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                        Servicio
                      </th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-16">
                        Cant.
                      </th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-28">
                        P. Unitario
                      </th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-20">
                        Desc. %
                      </th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-28">
                        Total
                      </th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5">
                          <p className="font-medium">{item.detalle}</p>
                          <p className="text-xs text-slate-400">
                            {item.periodicidad === 'M' ? 'Mensual' : 'Única vez'}
                          </p>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              actualizarItem(item.id, 'cantidad', Number(e.target.value))
                            }
                            className="h-7 text-right text-sm w-14"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={item.punitario}
                            onChange={(e) =>
                              actualizarItem(item.id, 'punitario', Number(e.target.value))
                            }
                            className="h-7 text-right text-sm w-28"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={item.descuento}
                            onChange={(e) =>
                              actualizarItem(item.id, 'descuento', Number(e.target.value))
                            }
                            className="h-7 text-right text-sm w-16"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="px-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => eliminarItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Agregue al menos un servicio al recibo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totales + Observaciones */}
        {items.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <FormField label="Observaciones" htmlFor="rec-obs">
                    <Input
                      id="rec-obs"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones del recibo..."
                    />
                  </FormField>
                </div>
                <div className="space-y-2 text-right min-w-[200px]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Subtotal:</span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="font-bold text-slate-800">TOTAL:</span>
                    <span className="text-lg font-black text-slate-900 tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>
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
          <Button type="button" variant="outline" onClick={onCancelar}>
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || !cliente || items.length === 0 || !idFormaPago}
            className="min-w-[140px]"
          >
            {guardando ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Guardar Recibo
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
