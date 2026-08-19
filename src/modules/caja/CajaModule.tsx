/**
 * Módulo Caja — Arqueo y movimientos financieros. Task 13.
 */
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Scale, Plus, RefreshCw, Filter, Printer } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoading } from '@/components/shared/LoadingSpinner';
import { DatePicker } from '@/components/shared/DatePicker';
import { useIsMounted } from '@/hooks/useAsyncEffect';
import { PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { MovCaja, ResumenCaja } from '@/db/types';
import { getMovimientosCaja, getResumenCaja, registrarMovimientoManual } from '@/db/queries/caja';
import { formatDate, formatCurrency, today } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ImprimirReciboCaja } from './ImprimirReciboCaja';

export function CajaModule() {
  const [movimientos, setMovimientos] = useState<MovCaja[]>([]);
  const [resumen, setResumen] = useState<ResumenCaja>({
    total_ingresos: 0,
    total_egresos: 0,
    saldo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(today());
  const [fechaHasta, setFechaHasta] = useState(today());
  const [filtroNatural, setFiltroNatural] = useState<'todos' | 'I' | 'E'>('todos');
  const [mostrarMovManual, setMostrarMovManual] = useState(false);
  const [movAImprimir, setMovAImprimir] = useState<MovCaja | null>(null);

  // Form movimiento manual
  const [manConcepto, setManConcepto] = useState('');
  const [manNatural, setManNatural] = useState<'I' | 'E'>('I');
  const [manValor, setManValor] = useState('');
  const [guardandoMan, setGuardandoMan] = useState(false);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();
  const isMounted = useIsMounted();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [movs, res] = await Promise.all([
        getMovimientosCaja({ pageSize: 500, fechaDesde, fechaHasta }),
        getResumenCaja(fechaDesde, fechaHasta),
      ]);
      if (!isMounted()) return;
      let data = movs.data;
      if (filtroNatural !== 'todos') data = data.filter((m) => m.natural === filtroNatural);
      setMovimientos(data);
      setResumen(res);
    } catch (err) {
      if (isMounted()) error('Error', String(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [fechaDesde, fechaHasta, filtroNatural, error, isMounted]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleMovManual = async () => {
    if (!manConcepto.trim()) {
      error('Falta concepto', 'Ingrese una descripción del movimiento.');
      return;
    }
    const valor = Number(manValor);
    if (isNaN(valor) || valor <= 0) {
      error('Valor inválido', 'El valor debe ser mayor a cero.');
      return;
    }

    setGuardandoMan(true);
    try {
      await registrarMovimientoManual({
        concepto: manConcepto,
        natural: manNatural,
        valor,
        usuario: usuario?.nombre ?? 'sistema',
      });
      success(
        'Movimiento registrado',
        `${manNatural === 'I' ? 'Ingreso' : 'Egreso'} de ${formatCurrency(valor)} registrado.`
      );
      setManConcepto('');
      setManValor('');
      setMostrarMovManual(false);
      cargar();
    } catch (err) {
      error('Error', String(err));
    } finally {
      setGuardandoMan(false);
    }
  };

  const columns: ColumnDef<MovCaja>[] = [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      size: 100,
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: 'referencia',
      header: 'Ref.',
      size: 100,
      cell: ({ getValue }) => {
        const val = getValue<string>();
        if (!val) return <span className="text-xs text-slate-400">—</span>;
        // Mostrar con padding si es número
        const num = Number(val);
        if (!isNaN(num))
          return (
            <span className="text-xs font-mono text-slate-500">{String(num).padStart(6, '0')}</span>
          );
        return <span className="text-xs font-mono text-slate-500">{val}</span>;
      },
    },
    {
      accessorKey: 'cedula',
      header: 'Cliente/Prov.',
      size: 180,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.nombre_cliente || row.original.cedula || '—'}</span>
      ),
    },
    {
      accessorKey: 'concepto',
      header: 'Concepto',
      size: 200,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'natural',
      header: 'Tipo',
      size: 80,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === 'I' ? 'success' : 'destructive'} className="text-xs">
          {getValue<string>() === 'I' ? 'INGRESO' : 'EGRESO'}
        </Badge>
      ),
    },
    {
      accessorKey: 'valor',
      header: 'Valor',
      size: 120,
      cell: ({ row }) => (
        <span
          className={cn(
            'text-sm tabular-nums',
            row.original.natural === 'I' ? 'text-green-700' : 'text-red-600'
          )}
        >
          {row.original.natural === 'I' ? '+' : '-'}
          {formatCurrency(row.original.valor)}
        </span>
      ),
    },
    {
      id: 'acciones',
      header: '',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1.5 px-2 flex flex-col items-center gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setMovAImprimir(row.original);
            }}
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="text-[10px] text-slate-500">Imprimir</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <PageHeader
        title="Caja"
        description="Arqueo y movimientos financieros"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMostrarMovManual(!mostrarMovManual)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Mov. Manual
          </Button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Ingresos</p>
              <p className="text-lg font-black text-green-700 tabular-nums">
                {formatCurrency(resumen.total_ingresos)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Egresos</p>
              <p className="text-lg font-black text-red-600 tabular-nums">
                {formatCurrency(resumen.total_egresos)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            resumen.saldo >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                resumen.saldo >= 0 ? 'bg-green-200' : 'bg-red-200'
              )}
            >
              <Scale
                className={cn('w-5 h-5', resumen.saldo >= 0 ? 'text-green-700' : 'text-red-700')}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo Neto</p>
              <p
                className={cn(
                  'text-lg font-black tabular-nums',
                  resumen.saldo >= 0 ? 'text-green-700' : 'text-red-600'
                )}
              >
                {formatCurrency(resumen.saldo)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimiento manual inline */}
      {mostrarMovManual && (
        <Card className="border-blue-200 bg-blue-50/50 flex-shrink-0">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-blue-700 mb-3">Registrar movimiento manual</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-600 font-medium mb-1 block">Concepto</label>
                <Input
                  value={manConcepto}
                  onChange={(e) => setManConcepto(e.target.value)}
                  placeholder="Descripción del movimiento..."
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 block">Tipo</label>
                <Select value={manNatural} onValueChange={(v) => setManNatural(v as 'I' | 'E')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Ingreso</SelectItem>
                    <SelectItem value="E">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1 block">Valor ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={manValor}
                  onChange={(e) => setManValor(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setMostrarMovManual(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleMovManual} disabled={guardandoMan}>
                {guardandoMan ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Registrar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Desde:</label>
          <DatePicker
            value={fechaDesde}
            onChange={(v) => setFechaDesde(v ?? '')}
            placeholder="Fecha desde"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Hasta:</label>
          <DatePicker
            value={fechaHasta}
            onChange={(v) => setFechaHasta(v ?? '')}
            placeholder="Fecha hasta"
          />
        </div>
        <Select
          value={filtroNatural}
          onValueChange={(v) => setFiltroNatural(v as 'todos' | 'I' | 'E')}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="I">Solo ingresos</SelectItem>
            <SelectItem value="E">Solo egresos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" onClick={cargar}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <PageLoading text="Cargando movimientos..." />
      ) : (
        <DataTable
          columns={columns}
          data={movimientos}
          searchPlaceholder="Buscar por concepto, referencia..."
          emptyMessage="No hay movimientos para los filtros seleccionados."
          pageSize={PAGE_SIZE.LIST}
        />
      )}

      <ImprimirReciboCaja movimiento={movAImprimir} onClose={() => setMovAImprimir(null)} />
    </div>
  );
}
