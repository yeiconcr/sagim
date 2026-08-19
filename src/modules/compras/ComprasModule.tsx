/**
 * Módulo Compras a Proveedores. Task 12.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Truck,
  ArrowLeft,
  Plus as PlusIcon,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
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
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { PageLoading } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { Compra, Proveedor, Inventario, FormaPago } from '@/db/types';
import { getCompras, guardarCompra } from '@/db/queries/compras';
import { getProveedores, getFormasPago } from '@/db/queries/catalogos';
import { getInventario } from '@/db/queries/inventario';
import { formatDate, formatCurrency, today } from '@/lib/utils';
import { CrearArticuloRapido } from './CrearArticuloRapido';
import { DatePicker } from '@/components/shared/DatePicker';

type Vista = 'lista' | 'nuevo';

interface ItemCompra {
  id: string;
  codigo: string;
  detalle: string;
  cantidad: number;
  punitario: number;
  total: number;
}

export function ComprasModule() {
  const [vista, setVista] = useState<Vista>('lista');
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [articulos, setArticulos] = useState<Inventario[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [items, setItems] = useState<ItemCompra[]>([]);
  // Form fields
  const [idProveedor, setIdProveedor] = useState('');
  const [fecha, setFecha] = useState(today());
  const [nroDocumento, setNroDocumento] = useState('');
  const [idFormaPago, setIdFormaPago] = useState('');
  const [plazo, setPlazo] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [showCrearArticulo, setShowCrearArticulo] = useState(false);
  const [articuloSel, setArticuloSel] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompras({ pageSize: 200 });
      setCompras(result.data);
    } catch (err) {
      error('Error', String(err));
    } finally {
      setLoading(false);
    }
  }, [error]);

  const cargarFormulario = useCallback(async () => {
    const [prov, art, fps] = await Promise.all([
      getProveedores(),
      getInventario({ pageSize: 500 }),
      getFormasPago(true),
    ]);
    setProveedores(prov);
    setArticulos(art.data);
    setFormasPago(fps);
    if (fps.length > 0) {
      setIdFormaPago(String(fps[0].id));
      setPlazo(fps[0].plazo_dias);
    }
  }, []);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  const abrirNuevo = () => {
    setItems([]);
    setIdProveedor('');
    setFecha(today());
    setNroDocumento('');
    setObservaciones('');
    setArticuloSel('');
    cargarFormulario();
    setVista('nuevo');
  };

  const agregarItem = () => {
    if (articuloSel === 'GASTO') {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          codigo: 'GASTO',
          detalle: '',
          cantidad: 1,
          punitario: 0,
          total: 0,
        },
      ]);
      setArticuloSel('');
      return;
    }
    const art = articulos.find((a) => a.codigo === articuloSel);
    if (!art) return;
    const punitario = art.precio_compra;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        codigo: art.codigo,
        detalle: art.nombre,
        cantidad: 1,
        punitario,
        total: punitario,
      },
    ]);
    setArticuloSel('');
  };

  const handleActualizarDetalleLibre = (id: string, nuevoDetalle: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, detalle: nuevoDetalle } : i)));
  };

  const actualizarItem = (id: string, campo: 'cantidad' | 'punitario', valor: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [campo]: valor };
        updated.total = updated.cantidad * updated.punitario;
        return updated;
      })
    );
  };

  const totalCompra = items.reduce((s, i) => s + i.total, 0);

  const handleGuardar = async () => {
    if (!idProveedor) {
      error('Falta proveedor', 'Seleccione un proveedor.');
      return;
    }
    if (items.length === 0) {
      error('Sin ítems', 'Agregue artículos a la compra.');
      return;
    }
    if (items.some((i) => !i.detalle.trim())) {
      error(
        'Descripción faltante',
        'Todos los gastos libres o artículos deben tener una descripción.'
      );
      return;
    }
    setGuardando(true);
    try {
      const nroCompra = await guardarCompra({
        idProveedor: Number(idProveedor),
        fecha,
        nroDocumento,
        idFormaPago: Number(idFormaPago),
        plazo,
        items: items.map((i) => ({
          codigo: i.codigo,
          detalle: i.detalle,
          cantidad: i.cantidad,
          punitario: i.punitario,
          total: i.total,
        })),
        total: totalCompra,
        observaciones,
        usuario: usuario?.nombre ?? 'sistema',
      });
      success('Compra registrada', `Compra N° ${nroCompra} guardada. Stock actualizado.`);
      setVista('lista');
      cargarLista();
    } catch (err) {
      error('Error', String(err));
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnDef<Compra>[] = [
    {
      accessorKey: 'nro_compra',
      header: 'N° Compra',
      size: 100,
      cell: ({ getValue }) => (
        <span className="font-mono font-bold text-sm">
          {String(getValue<number>()).padStart(6, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      size: 100,
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: 'nombre_proveedor',
      header: 'Proveedor',
      size: 200,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'nombre_forma_pago',
      header: 'Forma Pago',
      size: 120,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 90,
      cell: ({ getValue }) =>
        getValue<string>() === 'A' ? (
          <span className="text-xs text-green-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            VIGENTE
          </span>
        ) : (
          <span className="text-xs text-red-700 font-medium flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            ANULADA
          </span>
        ),
    },
  ];

  if (vista === 'nuevo') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto min-h-full flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              title="Volver"
              aria-label="Volver"
              onClick={() => setVista('lista')}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-slate-800">Nueva Compra a Proveedor</h1>
          </div>

          <Card>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField label="Proveedor" required className="col-span-2">
                <Select value={idProveedor} onValueChange={setIdProveedor}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Fecha" htmlFor="com-fecha">
                <DatePicker
                  value={fecha}
                  onChange={(v) => setFecha(v ?? today())}
                  maxYear={new Date().getFullYear() + 1}
                />
              </FormField>
              <FormField label="N° Documento" htmlFor="com-doc">
                <Input
                  id="com-doc"
                  value={nroDocumento}
                  onChange={(e) => setNroDocumento(e.target.value)}
                  placeholder="Factura del proveedor"
                />
              </FormField>
              <FormField label="Forma de pago" className="col-span-2">
                <Select
                  value={idFormaPago}
                  onValueChange={(v) => {
                    setIdFormaPago(v);
                    setPlazo(formasPago.find((f) => String(f.id) === v)?.plazo_dias ?? 0);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPago.map((fp) => (
                      <SelectItem key={fp.id} value={String(fp.id)}>
                        {fp.detalle}
                        {fp.plazo_dias > 0 ? ` (${fp.plazo_dias} días)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Observaciones" htmlFor="com-obs" className="col-span-2">
                <Input
                  id="com-obs"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones..."
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">
                Artículos comprados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={articuloSel} onValueChange={setArticuloSel}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Seleccionar artículo o gasto libre..." />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="GASTO" className="font-bold text-orange-600">
                      Gasto Libre (Sin Inventario)
                    </SelectItem>
                    {articulos.map((a) => (
                      <SelectItem key={a.codigo} value={a.codigo}>
                        <span className="font-mono text-xs mr-2 text-slate-400">{a.codigo}</span>
                        {a.nombre}{' '}
                        <span className="text-xs text-slate-400 ml-1">
                          ({formatCurrency(a.precio_compra)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => setShowCrearArticulo(true)}
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
                  Nuevo Artículo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9"
                  onClick={agregarItem}
                  disabled={!articuloSel}
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
                  Agregar
                </Button>
              </div>

              {items.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                        Artículo
                      </th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-16">
                        Cant.
                      </th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase w-28">
                        P. Compra
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
                        <td className="px-2 py-1.5 font-medium">
                          {item.codigo === 'GASTO' ? (
                            <Input
                              value={item.detalle}
                              onChange={(e) =>
                                handleActualizarDetalleLibre(item.id, e.target.value)
                              }
                              className="h-7 text-sm"
                              placeholder="Descripción del gasto..."
                            />
                          ) : (
                            item.detalle
                          )}
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
                        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="px-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setItems((p) => p.filter((i) => i.id !== item.id))}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={3} className="px-2 py-2 text-right font-bold text-slate-700">
                        TOTAL COMPRA:
                      </td>
                      <td className="px-2 py-2 text-right font-black text-lg text-slate-900 tabular-nums">
                        {formatCurrency(totalCompra)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Agregue artículos a la compra
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setVista('lista')}>
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={guardando || !idProveedor || items.length === 0}
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
                  Registrar Compra
                </>
              )}
            </Button>
          </div>
          <CrearArticuloRapido
            open={showCrearArticulo}
            onClose={() => setShowCrearArticulo(false)}
            onSuccess={(nuevo) => {
              setArticulos((prev) => [...prev, nuevo]);
              setArticuloSel(nuevo.codigo);
              setShowCrearArticulo(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <PageHeader
        title="Compras a Proveedores"
        description="Registro de compras con actualización automática de inventario"
        actions={
          <Button onClick={abrirNuevo} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Compra
          </Button>
        }
      />
      {loading ? (
        <PageLoading text="Cargando compras..." />
      ) : (
        <DataTable
          columns={columns}
          data={compras}
          searchPlaceholder="Buscar por proveedor..."
          emptyMessage="No hay compras registradas."
          pageSize={20}
        />
      )}
    </div>
  );
}
