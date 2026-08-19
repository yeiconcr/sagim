/**
 * Módulo Procesos — Vencimientos, Cumpleaños e Inactivar Clientes. Task 16.
 */
import { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertTriangle, UserX, Clock, RefreshCw } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageLoading } from '@/components/shared/LoadingSpinner';
import { useIsMounted } from '@/hooks/useAsyncEffect';
import { useToast } from '@/store/toastStore';
import { useAppStore } from '@/store/appStore';
import {
  getClientesVencimientos,
  getClientesCumpleanos,
  getClientesSinActividad,
  inactivarClientesMasivo,
} from '@/db/queries/clientes';
import { getParametros } from '@/db/queries/configuracion';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ClienteVenc {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  actividad: string;
  fecha_vencimiento: string;
  dias_restantes: number;
}
interface ClienteCumple {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  fecha_nacimiento: string;
  edad: number;
}
interface ClienteInactivo {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  ultimo_pago: string | null;
  dias_sin_pago: number;
}

export function ProcesosModule() {
  const [vencimientos, setVencimientos] = useState<ClienteVenc[]>([]);
  const [cumpleanos, setCumpleanos] = useState<ClienteCumple[]>([]);
  const [sinActividad, setSinActividad] = useState<ClienteInactivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [confirmInactivar, setConfirmInactivar] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(5);
  const [diasInactivar, setDiasInactivar] = useState(90);
  const { success, error } = useToast();
  const { setModulo, setClientePrecargado } = useAppStore();
  const isMounted = useIsMounted();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = await getParametros();
      if (!isMounted()) return;
      const alerta = params?.dias_alerta_vencimiento ?? 5;
      const inact = params?.dias_inactivar ?? 90;
      setDiasAlerta(alerta);
      setDiasInactivar(inact);
      const [vencs, cumps, sinAct] = await Promise.all([
        getClientesVencimientos(alerta),
        getClientesCumpleanos(),
        getClientesSinActividad(inact),
      ]);
      if (!isMounted()) return;
      setVencimientos(vencs as ClienteVenc[]);
      setCumpleanos(cumps as ClienteCumple[]);
      setSinActividad(sinAct as ClienteInactivo[]);
    } catch (err) {
      if (isMounted()) error('Error', String(err));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [error, isMounted]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleInactivarMasivo = async () => {
    if (seleccionados.size === 0) return;
    try {
      await inactivarClientesMasivo(Array.from(seleccionados));
      success(`${seleccionados.size} clientes inactivados`);
      setSeleccionados(new Set());
      cargar();
    } catch (err) {
      error('Error al inactivar', String(err));
    } finally {
      setConfirmInactivar(false);
    }
  };

  const toggleSeleccion = (cedula: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(cedula)) next.delete(cedula);
      else next.add(cedula);
      return next;
    });
  };

  const colsVenc: ColumnDef<ClienteVenc>[] = [
    {
      id: 'nombre',
      header: 'Cliente',
      size: 280,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.nombres} {row.original.apellidos}
        </span>
      ),
    },
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      size: 100,
      cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.cedula}</span>,
    },
    {
      accessorKey: 'celular',
      header: 'Celular',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'actividad',
      header: 'Actividad',
      size: 140,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'fecha_vencimiento',
      header: 'Vence',
      size: 100,
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: 'dias_restantes',
      header: 'Días',
      size: 90,
      cell: ({ getValue }) => {
        const d = getValue<number>();
        return (
          <Badge
            variant={d < 0 ? 'destructive' : d <= 3 ? 'warning' : 'success'}
            className="text-xs"
          >
            {d < 0 ? `Vencido ${Math.abs(d)}d` : d === 0 ? 'Hoy' : `${d} días`}
          </Badge>
        );
      },
    },
    {
      id: 'renovar',
      header: '',
      size: 90,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => {
            setClientePrecargado(row.original.cedula);
            setModulo('ventas-gym');
          }}
        >
          Renovar
        </Button>
      ),
    },
  ];

  const colsCumple: ColumnDef<ClienteCumple>[] = [
    {
      id: 'nombre',
      header: 'Cliente',
      size: 280,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.nombres} {row.original.apellidos}
        </span>
      ),
    },
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      size: 100,
      cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.cedula}</span>,
    },
    {
      accessorKey: 'celular',
      header: 'Celular',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
    },
    {
      accessorKey: 'fecha_nacimiento',
      header: 'Cumpleaños',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: 'edad',
      header: 'Edad',
      size: 80,
      cell: ({ getValue }) => (
        <span className="text-lg font-black text-pink-600">{getValue<number>()} años</span>
      ),
    },
  ];

  const colsInactivos: ColumnDef<ClienteInactivo>[] = [
    {
      id: 'sel',
      header: '',
      size: 40,
      cell: ({ row }) => (
        <Checkbox
          checked={seleccionados.has(row.original.cedula)}
          onCheckedChange={() => toggleSeleccion(row.original.cedula)}
        />
      ),
    },
    {
      id: 'nombre',
      header: 'Cliente',
      size: 280,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.nombres} {row.original.apellidos}
        </span>
      ),
    },
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      size: 100,
      cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.cedula}</span>,
    },
    {
      accessorKey: 'ultimo_pago',
      header: 'Último pago',
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-sm">
          {getValue<string>() ? formatDate(getValue<string>()!) : 'Sin pagos'}
        </span>
      ),
    },
    {
      accessorKey: 'dias_sin_pago',
      header: 'Días sin actividad',
      size: 130,
      cell: ({ getValue }) => (
        <span
          className={cn(
            'text-sm',
            getValue<number>() > diasInactivar ? 'text-red-600' : 'text-orange-500'
          )}
        >
          {getValue<number>()} días
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <PageHeader
        title="Procesos"
        description="Vencimientos de membresías, cumpleaños del día e inactivación de clientes"
        actions={
          <Button variant="outline" size="sm" onClick={cargar}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Actualizar
          </Button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={cn(vencimientos.length > 0 ? 'border-orange-200 bg-orange-50' : '')}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle
              className={cn(
                'w-8 h-8 flex-shrink-0',
                vencimientos.length > 0 ? 'text-orange-500' : 'text-slate-300'
              )}
            />
            <div>
              <p className="text-xs text-slate-500">Vencimientos próximos ({diasAlerta}d)</p>
              <p
                className={cn(
                  'text-xl font-black',
                  vencimientos.length > 0 ? 'text-orange-600' : 'text-slate-400'
                )}
              >
                {vencimientos.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(cumpleanos.length > 0 ? 'border-pink-200 bg-pink-50' : '')}>
          <CardContent className="p-3 flex items-center gap-3">
            <Calendar
              className={cn(
                'w-8 h-8 flex-shrink-0',
                cumpleanos.length > 0 ? 'text-pink-500' : 'text-slate-300'
              )}
            />
            <div>
              <p className="text-xs text-slate-500">Cumpleaños hoy</p>
              <p
                className={cn(
                  'text-xl font-black',
                  cumpleanos.length > 0 ? 'text-pink-600' : 'text-slate-400'
                )}
              >
                {cumpleanos.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <UserX className="w-8 h-8 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Sin actividad ({diasInactivar}d)</p>
              <p className="text-xl font-black text-slate-600">{sinActividad.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <PageLoading text="Cargando procesos..." />
      ) : (
        <Tabs defaultValue="vencimientos" className="flex-1 flex flex-col min-h-0">
          <TabsList className="self-start flex-shrink-0">
            <TabsTrigger value="vencimientos" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Vencimientos ({vencimientos.length})
            </TabsTrigger>
            <TabsTrigger value="cumpleanos" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Cumpleaños ({cumpleanos.length})
            </TabsTrigger>
            <TabsTrigger value="inactivar" className="gap-1.5">
              <UserX className="w-3.5 h-3.5" />
              Inactivar ({sinActividad.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vencimientos" className="flex-1 mt-4 pb-6">
            <div className="flex-1 min-h-0 flex flex-col">
              <DataTable
                columns={colsVenc}
                data={vencimientos}
                searchPlaceholder="Buscar cliente..."
                emptyMessage={`No hay vencimientos en los próximos ${diasAlerta} días.`}
                pageSize={500}
              />
            </div>
          </TabsContent>

          <TabsContent value="cumpleanos" className="flex-1 mt-4 pb-6">
            <div className="flex-1 min-h-0 flex flex-col">
              <DataTable
                columns={colsCumple}
                data={cumpleanos}
                searchPlaceholder="Buscar cliente..."
                emptyMessage="No hay cumpleaños hoy."
                pageSize={500}
              />
            </div>
          </TabsContent>

          <TabsContent value="inactivar" className="flex-1 mt-4 pb-6">
            <div className="flex flex-col gap-3">
              {seleccionados.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    {seleccionados.size} cliente{seleccionados.size !== 1 ? 's' : ''} seleccionado
                    {seleccionados.size !== 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSeleccionados(new Set())}>
                      Limpiar selección
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmInactivar(true)}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1.5" />
                      Inactivar seleccionados
                    </Button>
                  </div>
                </div>
              )}
              <DataTable
                columns={colsInactivos}
                data={sinActividad}
                searchPlaceholder="Buscar cliente..."
                emptyMessage={`No hay clientes sin actividad en los últimos ${diasInactivar} días.`}
                pageSize={500}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={confirmInactivar}
        onOpenChange={(o) => !o && setConfirmInactivar(false)}
        title={`¿Inactivar ${seleccionados.size} cliente${seleccionados.size !== 1 ? 's' : ''}?`}
        description={`Se marcará${seleccionados.size !== 1 ? 'n' : ''} como INACTIVO${seleccionados.size !== 1 ? 'S' : ''} y no aparecerá${seleccionados.size !== 1 ? 'n' : ''} en recepción. Podrá reactivarlos desde el módulo Clientes.`}
        confirmLabel="Inactivar"
        variant="destructive"
        onConfirm={handleInactivarMasivo}
      />
    </div>
  );
}
