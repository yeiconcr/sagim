import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  CreditCard,
  Filter,
  Activity,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageLoading } from '@/components/shared/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { Cliente } from '@/db/types';
import {
  getClientes,
  inactivarCliente,
  activarCliente,
  countClientesActivos,
} from '@/db/queries/clientes';
import { formatDate } from '@/lib/utils';

interface Props {
  refetchKey: number;
  onNuevo: () => void;
  onEditar: (c: Cliente) => void;
  onVerPagos: (c: Cliente) => void;
  onVerMedidas: (c: Cliente) => void;
}

export function ClientesLista({ refetchKey, onNuevo, onEditar, onVerPagos, onVerMedidas }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActivos, setTotalActivos] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'A' | 'I'>('A');
  const [confirmToggle, setConfirmToggle] = useState<Cliente | null>(null);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClientes({
        pageSize: 500,
        estado: filtroEstado,
        orderBy: 'nombres',
      });
      setClientes(result.data);
      const activos = await countClientesActivos();
      setTotalActivos(activos);
    } catch (err) {
      error('Error', `No se pudieron cargar los clientes: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, error]);

  useEffect(() => {
    cargar();
  }, [cargar, refetchKey]);

  const handleToggleEstado = async () => {
    if (!confirmToggle) return;
    try {
      if (confirmToggle.estado === 'A') {
        await inactivarCliente(confirmToggle.cedula);
        success('Inactivado', `${confirmToggle.nombres} marcado como inactivo.`);
      } else {
        await activarCliente(confirmToggle.cedula);
        success('Activado', `${confirmToggle.nombres} marcado como activo.`);
      }
      cargar();
    } catch (err) {
      error('Error', String(err));
    } finally {
      setConfirmToggle(null);
    }
  };

  const columns: ColumnDef<Cliente>[] = [
    {
      accessorKey: 'inscripcion',
      header: 'Insc.',
      size: 70,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-500">{row.original.inscripcion}</span>
      ),
    },
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      size: 120,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.cedula}</span>,
    },
    {
      id: 'nombre',
      header: 'Nombre',
      size: 280,
      accessorFn: (r) => `${r.nombres} ${r.apellidos}`,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.nombres} {row.original.apellidos}
        </span>
      ),
    },
    {
      accessorKey: 'celular',
      header: 'Celular',
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-600">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'ciudad',
      header: 'Ciudad',
      size: 100,
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-600">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'fecha_inscripcion',
      header: 'Inscripción',
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 90,
      cell: ({ getValue }) => {
        const e = getValue<string>();
        return (
          <Badge variant={e === 'A' ? 'success' : 'secondary'} className="text-xs">
            {e === 'A' ? 'ACTIVO' : 'INACTIVO'}
          </Badge>
        );
      },
    },
    {
      id: 'acciones',
      header: '',
      size: 240,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                onVerPagos(c);
              }}
            >
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-slate-600">Pagos</span>
            </button>
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                onVerMedidas(c);
              }}
            >
              <Activity className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] text-slate-600">Medidas</span>
            </button>
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                onEditar(c);
              }}
            >
              <Pencil className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] text-slate-600">Editar</span>
            </button>
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmToggle(c);
              }}
            >
              {c.estado === 'A' ? (
                <ToggleRight className="w-4 h-4 text-green-500" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-[10px] text-slate-600">
                {c.estado === 'A' ? 'Inactivar' : 'Activar'}
              </span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <PageHeader
        title="Clientes"
        description={`${totalActivos.toLocaleString('es-CO')} clientes activos`}
        actions={
          <Button onClick={onNuevo} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Cliente
          </Button>
        }
      />

      {loading ? (
        <PageLoading text="Cargando clientes..." />
      ) : (
        <DataTable
          columns={columns}
          data={clientes}
          searchPlaceholder="Buscar por nombre, cédula..."
          onRowClick={onEditar}
          emptyMessage="No se encontraron clientes."
          pageSize={PAGE_SIZE.LIST}
          toolbar={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={filtroEstado}
                onValueChange={(v) => setFiltroEstado(v as 'todos' | 'A' | 'I')}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Solo activos</SelectItem>
                  <SelectItem value="I">Solo inactivos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}

      {/* Confirm toggle estado */}
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        title={confirmToggle?.estado === 'A' ? '¿Inactivar cliente?' : '¿Activar cliente?'}
        description={
          confirmToggle?.estado === 'A'
            ? `${confirmToggle?.nombres} ${confirmToggle?.apellidos} quedará como INACTIVO y no podrá ser seleccionado en recepción.`
            : `${confirmToggle?.nombres} ${confirmToggle?.apellidos} quedará como ACTIVO nuevamente.`
        }
        confirmLabel={confirmToggle?.estado === 'A' ? 'Inactivar' : 'Activar'}
        variant={confirmToggle?.estado === 'A' ? 'destructive' : 'default'}
        onConfirm={handleToggleEstado}
      />
    </div>
  );
}
