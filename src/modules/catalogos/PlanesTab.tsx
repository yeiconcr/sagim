/**
 * Tab de Planes/Membresías (antes llamado Actividades).
 * Gestiona los diferentes planes que puede adquirir un cliente.
 */
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/store/toastStore';
import type { Actividad } from '@/db/types';
import {
  getActividades,
  createActividad,
  updateActividad,
  toggleActividadEstado,
  actividadCodigoExiste,
} from '@/db/queries/catalogos';
import { formatCurrency, cn } from '@/lib/utils';

const schema = z.object({
  codigo: z.string().min(1, 'Código requerido').max(20),
  nombre: z.string().min(1, 'Nombre requerido').max(100),
  tarifa: z.coerce.number().min(0),
  factor: z.coerce.number().min(1, 'Factor mínimo 1 día').max(365),
  periodicidad: z.enum(['M', 'U']),
  impuesto: z.coerce.number().min(0).max(100),
  estado: z.enum(['A', 'I']),
});
type FormValues = z.infer<typeof schema>;

export function PlanesTab() {
  const [planes, setPlanes] = useState<Actividad[]>([]);
  const [editando, setEditando] = useState<Actividad | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    setPlanes(await getActividades(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { periodicidad: 'M', factor: 30, impuesto: 0, estado: 'A', tarifa: 0 },
  });

  const abrirNuevo = () => {
    reset({ periodicidad: 'M', factor: 30, impuesto: 0, estado: 'A', tarifa: 0 });
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (plan: Actividad) => {
    reset({
      codigo: plan.codigo,
      nombre: plan.nombre,
      tarifa: plan.tarifa,
      factor: plan.factor,
      periodicidad: plan.periodicidad,
      impuesto: plan.impuesto,
      estado: plan.estado,
    });
    setEditando(plan);
    setMostrarForm(true);
  };

  const cerrar = () => {
    setMostrarForm(false);
    setEditando(null);
    reset();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setGuardando(true);

      // Validar código duplicado
      if (!editando) {
        const codigoExiste = await actividadCodigoExiste(data.codigo);
        if (codigoExiste) {
          setFormError('codigo', { message: 'Este código ya está registrado' });
          return;
        }
      }

      if (editando) {
        await updateActividad(editando.id, {
          nombre: data.nombre,
          tarifa: data.tarifa,
          factor: data.factor,
          periodicidad: data.periodicidad,
          impuesto: data.impuesto,
          estado: data.estado,
        });
        success('Plan actualizado');
      } else {
        await createActividad({
          codigo: data.codigo,
          nombre: data.nombre,
          tarifa: data.tarifa,
          factor: data.factor,
          periodicidad: data.periodicidad,
          impuesto: data.impuesto,
          estado: data.estado,
        });
        success('Plan creado');
      }
      cerrar();
      cargar();
    } catch (err) {
      error('Error', String(err));
    } finally {
      setGuardando(false);
    }
  };

  const handleToggle = async (plan: Actividad) => {
    try {
      await toggleActividadEstado(plan.id, plan.estado === 'A' ? 'I' : 'A');
      success(plan.estado === 'A' ? 'Plan inactivado' : 'Plan activado');
      cargar();
    } catch (err) {
      error('Error', String(err));
    }
  };

  const columns: ColumnDef<Actividad>[] = [
    {
      accessorKey: 'codigo',
      header: 'Código',
      size: 80,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre del Plan',
      size: 200,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'tarifa',
      header: 'Tarifa',
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums">{formatCurrency(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'factor',
      header: 'Duración',
      size: 90,
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>()} días</span>,
    },
    {
      accessorKey: 'periodicidad',
      header: 'Tipo',
      size: 100,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs">
          {getValue<string>() === 'M' ? 'Recurrente' : 'Única vez'}
        </Badge>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === 'A' ? 'success' : 'secondary'} className="text-xs">
          {getValue<string>() === 'A' ? 'ACTIVO' : 'INACTIVO'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: '',
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              abrirEditar(row.original);
            }}
          >
            <Pencil className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] text-slate-600">Editar</span>
          </button>
          <button
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(row.original);
            }}
          >
            {row.original.estado === 'A' ? (
              <ToggleRight className="w-4 h-4 text-green-500" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-[10px] text-slate-600">
              {row.original.estado === 'A' ? 'Inactivar' : 'Activar'}
            </span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex justify-between items-center flex-shrink-0">
        <p className="text-sm text-slate-500">
          {planes.filter((p) => p.estado === 'A').length} planes activos de {planes.length}
        </p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Plan
          </Button>
        )}
      </div>

      {mostrarForm && (
        <Card className="flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              {editando ? `Editar: ${editando.nombre}` : 'Nuevo Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <FormField
                  label="Código"
                  required
                  error={errors.codigo?.message}
                  htmlFor="plan-cod"
                >
                  <Input
                    id="plan-cod"
                    {...register('codigo')}
                    disabled={!!editando}
                    className={cn(errors.codigo && 'border-destructive')}
                    placeholder="Ej: MES01"
                  />
                </FormField>
                <FormField
                  label="Nombre del Plan"
                  required
                  error={errors.nombre?.message}
                  htmlFor="plan-nom"
                  className="col-span-2"
                >
                  <Input
                    id="plan-nom"
                    {...register('nombre')}
                    className={cn(errors.nombre && 'border-destructive')}
                    placeholder="Ej: Mensualidad Gym"
                  />
                </FormField>
                <FormField label="Estado">
                  <Controller
                    name="estado"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Activo</SelectItem>
                          <SelectItem value="I">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField
                  label="Tarifa ($)"
                  required
                  error={errors.tarifa?.message}
                  htmlFor="plan-tar"
                >
                  <Input
                    id="plan-tar"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('tarifa')}
                    className={cn(errors.tarifa && 'border-destructive')}
                  />
                </FormField>
                <FormField
                  label="Duración (días)"
                  required
                  error={errors.factor?.message}
                  htmlFor="plan-fac"
                >
                  <Input
                    id="plan-fac"
                    type="number"
                    min="1"
                    {...register('factor')}
                    className={cn(errors.factor && 'border-destructive')}
                  />
                </FormField>
                <FormField label="Tipo de cobro">
                  <Controller
                    name="periodicidad"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Recurrente (membresía)</SelectItem>
                          <SelectItem value="U">Única vez (servicio)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Impuesto %" htmlFor="plan-imp">
                  <Input
                    id="plan-imp"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register('impuesto')}
                  />
                </FormField>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                La <strong>duración</strong> indica cuántos días dura la membresía. Ej: 30 =
                mensual, 15 = quincenal, 365 = anual.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cerrar}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={guardando}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {guardando ? 'Guardando...' : editando ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={planes}
          searchPlaceholder="Buscar planes..."
          onRowClick={abrirEditar}
          emptyMessage="No hay planes registrados."
          pageSize={PAGE_SIZE.CATALOG}
        />
      </div>
    </div>
  );
}
