/**
 * Módulo Ventas Gym — Recibos de pago de servicios/membresías.
 * Equivalente al Tab "Gimnasio" de frmIngresos en VB6. Task 10.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Printer,
  Ban,
  FileText,
  RefreshCw,
  Dumbbell,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageLoading } from '@/components/shared/LoadingSpinner';
import { DatePicker } from '@/components/shared/DatePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import type { Recibo } from '@/db/types';
import { getRecibos, anularReciboGym } from '@/db/queries/ventas';
import { formatDate, formatCurrency, today } from '@/lib/utils';
import { NuevoReciboForm } from './NuevoReciboForm';
import { ImprimirReciboGym } from './ImprimirReciboGym';

type Vista = 'lista' | 'nuevo';

export function VentasGymModule() {
  const [vista, setVista] = useState<Vista>('lista');
  const [refetchKey, setRefetchKey] = useState(0);
  const { clientePrecargado, setClientePrecargado } = useAppStore();

  // Si viene cliente precargado desde Recepción, abrir formulario directamente
  useEffect(() => {
    if (clientePrecargado) {
      setVista('nuevo');
    }
  }, [clientePrecargado]);

  if (vista === 'nuevo') {
    return (
      <NuevoReciboForm
        cedulaInicial={clientePrecargado ?? undefined}
        onGuardar={() => {
          setClientePrecargado(null);
          setRefetchKey((k) => k + 1);
          setVista('lista');
        }}
        onCancelar={() => {
          setClientePrecargado(null);
          setVista('lista');
        }}
      />
    );
  }

  return (
    <RecibosLista
      refetchKey={refetchKey}
      onNuevo={() => setVista('nuevo')}
      onRefetch={() => setRefetchKey((k) => k + 1)}
    />
  );
}

// =============================================
// LISTA DE RECIBOS
// =============================================
interface ListaProps {
  refetchKey: number;
  onNuevo: () => void;
  onRefetch: () => void;
}

function RecibosLista({ refetchKey, onNuevo, onRefetch }: ListaProps) {
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'A' | 'X'>('A');
  const [filtroFecha, setFiltroFecha] = useState(today());
  const [confirmAnular, setConfirmAnular] = useState<Recibo | null>(null);
  const [reciboAImprimir, setReciboAImprimir] = useState<Recibo | null>(null);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRecibos({
        pageSize: 200,
        estado: filtroEstado,
        fechaDesde: filtroFecha,
        fechaHasta: filtroFecha,
      });
      setRecibos(result.data);
    } catch (err) {
      error('Error', String(err));
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroFecha, error]);

  useEffect(() => {
    cargar();
  }, [cargar, refetchKey]);

  const handleAnular = async () => {
    if (!confirmAnular) return;
    try {
      await anularReciboGym(
        confirmAnular.nro_docu,
        confirmAnular.total ?? 0,
        confirmAnular.cedula ?? '',
        usuario?.nombre ?? 'sistema'
      );
      success(
        'Recibo anulado',
        `Recibo N° ${confirmAnular.nro_docu} anulado. Se generó reversa en caja.`
      );
      onRefetch();
    } catch (err) {
      error('Error al anular', String(err));
    } finally {
      setConfirmAnular(null);
    }
  };

  const columns: ColumnDef<Recibo>[] = [
    {
      accessorKey: 'nro_docu',
      header: 'N° Recibo',
      size: 90,
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
      accessorKey: 'cedula',
      header: 'Cédula',
      size: 100,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.cedula}</span>,
    },
    {
      accessorKey: 'nombre_cliente',
      header: 'Cliente',
      size: 220,
      cell: ({ row }) => <span className="text-sm">{row.original.nombre_cliente || '—'}</span>,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums">{formatCurrency(getValue<number>() ?? 0)}</span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 90,
      cell: ({ getValue }) => {
        const e = getValue<string>();
        return (
          <div className="flex items-center gap-1">
            {e === 'A' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-700 font-medium">VIGENTE</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-red-700 font-medium">ANULADO</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      id: 'acciones',
      header: '',
      size: 130,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              setReciboAImprimir(row.original);
            }}
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="text-[10px] text-slate-600">Imprimir</span>
          </button>
          {row.original.estado === 'A' && (
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAnular(row.original);
              }}
            >
              <Ban className="w-4 h-4 text-red-500" />
              <span className="text-[10px] text-red-600">Anular</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  // Resumen del día
  const totalDia = recibos.filter((r) => r.estado === 'A').reduce((s, r) => s + (r.total ?? 0), 0);
  const cantidadDia = recibos.filter((r) => r.estado === 'A').length;

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <PageHeader
        title="Ventas Gym"
        description="Registro de recibos de pago por membresías y servicios"
        actions={
          <Button onClick={onNuevo} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Venta
          </Button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Recibos del día</p>
              <p className="text-xl font-black text-slate-800">{cantidadDia}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <FileText className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Total recaudado</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(totalDia)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Fecha:</label>
          <DatePicker
            value={filtroFecha}
            onChange={(v) => setFiltroFecha(v ?? today())}
            maxYear={new Date().getFullYear() + 1}
          />
        </div>
        <Select
          value={filtroEstado}
          onValueChange={(v) => setFiltroEstado(v as 'todos' | 'A' | 'X')}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Solo vigentes</SelectItem>
            <SelectItem value="X">Solo anulados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" onClick={cargar}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <PageLoading text="Cargando recibos..." />
      ) : (
        <DataTable
          columns={columns}
          data={recibos}
          searchPlaceholder="Buscar por cliente, cédula..."
          emptyMessage="No hay recibos para los filtros seleccionados."
          pageSize={20}
          showSearch={recibos.length > 10}
        />
      )}

      <ImprimirReciboGym recibo={reciboAImprimir} onClose={() => setReciboAImprimir(null)} />

      <ConfirmDialog
        open={!!confirmAnular}
        onOpenChange={(o) => !o && setConfirmAnular(null)}
        title="¿Anular recibo?"
        description={`Se anulará el Recibo N° ${confirmAnular?.nro_docu} de ${confirmAnular?.nombre_cliente} por ${formatCurrency(confirmAnular?.total ?? 0)}. Se creará un egreso de reversa en caja. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, anular"
        variant="destructive"
        onConfirm={handleAnular}
      />
    </div>
  );
}
