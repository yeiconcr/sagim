import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { DatePicker } from '@/components/shared/DatePicker';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/store/toastStore';
import type { Instructor, Especialidad } from '@/db/types';
import {
  getInstructores,
  createInstructor,
  updateInstructor,
  toggleInstructorEstado,
  getEspecialidades,
  instructorCedulaExiste,
} from '@/db/queries/catalogos';
import { formatCurrency, cn } from '@/lib/utils';

const schema = z.object({
  cedula: z.string().min(1, 'Cédula requerida').regex(/^\d+$/, 'Solo números'),
  nombres: z.string().min(1, 'Nombres requeridos'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tarifa: z.coerce.number().min(0, 'Tarifa no puede ser negativa'),
  estado: z.enum(['A', 'I']),
});
type FormValues = z.infer<typeof schema>;

export function InstructoresTab() {
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);
  const [fechaNacimiento, setFechaNacimiento] = useState<string | null>(null);
  const [editando, setEditando] = useState<Instructor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Instructor | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    const [inst, esp] = await Promise.all([getInstructores(false), getEspecialidades(false)]);
    setInstructores(inst);
    setEspecialidades(esp.filter((e) => e.estado === 'A'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'A', tarifa: 0 },
  });

  const abrirNuevo = () => {
    reset({ estado: 'A', tarifa: 0 });
    setEspecialidadesSeleccionadas([]);
    setFechaNacimiento(null);
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (inst: Instructor) => {
    reset({
      cedula: inst.cedula,
      nombres: inst.nombres,
      apellidos: inst.apellidos,
      direccion: inst.direccion ?? '',
      telefono: inst.telefono ?? '',
      celular: inst.celular ?? '',
      email: inst.email ?? '',
      tarifa: inst.tarifa,
      estado: inst.estado,
    });
    setFechaNacimiento(inst.fecha_nacimiento ?? null);
    setEspecialidadesSeleccionadas(inst.especialidades?.map((e) => e.id) || []);
    setEditando(inst);
    setMostrarForm(true);
  };

  const cerrar = () => {
    setMostrarForm(false);
    setEditando(null);
    setEspecialidadesSeleccionadas([]);
    setFechaNacimiento(null);
    reset();
  };

  const toggleEspecialidad = (id: number) => {
    setEspecialidadesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setGuardando(true);

      // Validar cédula duplicada
      const cedulaExiste = await instructorCedulaExiste(data.cedula, editando?.id);
      if (cedulaExiste) {
        setFormError('cedula', { message: 'Esta cédula ya está registrada' });
        return;
      }

      if (editando) {
        await updateInstructor(
          editando.id,
          {
            nombres: data.nombres.toUpperCase(),
            apellidos: data.apellidos.toUpperCase(),
            direccion: data.direccion || null,
            telefono: data.telefono || null,
            celular: data.celular || null,
            email: data.email || null,
            fecha_nacimiento: fechaNacimiento,
            tarifa: data.tarifa,
            estado: data.estado,
          },
          especialidadesSeleccionadas
        );
        success('Instructor actualizado');
      } else {
        await createInstructor(
          {
            cedula: data.cedula,
            nombres: data.nombres.toUpperCase(),
            apellidos: data.apellidos.toUpperCase(),
            direccion: data.direccion || null,
            telefono: data.telefono || null,
            celular: data.celular || null,
            email: data.email || null,
            fecha_nacimiento: fechaNacimiento,
            id_especialidad: null,
            tarifa: data.tarifa,
            estado: data.estado,
          },
          especialidadesSeleccionadas
        );
        success('Instructor creado');
      }
      cerrar();
      cargar();
    } catch (err) {
      error('Error', String(err));
    } finally {
      setGuardando(false);
    }
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    try {
      await toggleInstructorEstado(confirmToggle.id, confirmToggle.estado === 'A' ? 'I' : 'A');
      success(confirmToggle.estado === 'A' ? 'Instructor inactivado' : 'Instructor activado');
      cargar();
    } catch (err) {
      error('Error', String(err));
    } finally {
      setConfirmToggle(null);
    }
  };

  const columns: ColumnDef<Instructor>[] = [
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      size: 100,
      cell: ({ getValue }) => <span className="font-mono text-sm">{getValue<string>()}</span>,
    },
    {
      id: 'nombre',
      header: 'Nombre',
      size: 200,
      accessorFn: (r) => `${r.nombres} ${r.apellidos}`,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.nombres} {row.original.apellidos}
        </span>
      ),
    },
    {
      id: 'especialidades',
      header: 'Especialidades',
      size: 250,
      cell: ({ row }) => {
        const esps = row.original.especialidades || [];
        if (esps.length === 0) return <span className="text-sm text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {esps.map((e) => (
              <Badge key={e.id} variant="outline" className="text-xs">
                {e.nombre}
              </Badge>
            ))}
          </div>
        );
      },
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
      accessorKey: 'celular',
      header: 'Celular',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || '—'}</span>,
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
              setConfirmToggle(row.original);
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
          {instructores.filter((i) => i.estado === 'A').length} instructores activos
        </p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Instructor
          </Button>
        )}
      </div>

      {mostrarForm && (
        <Card className="flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              {editando ? `Editar: ${editando.nombres}` : 'Nuevo Instructor'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <FormField
                  label="Cédula"
                  required
                  error={errors.cedula?.message}
                  htmlFor="inst-ced"
                >
                  <Input
                    id="inst-ced"
                    {...register('cedula')}
                    disabled={!!editando}
                    className={cn(errors.cedula && 'border-destructive')}
                  />
                </FormField>
                <FormField
                  label="Nombres"
                  required
                  error={errors.nombres?.message}
                  htmlFor="inst-nom"
                >
                  <Input
                    id="inst-nom"
                    {...register('nombres', {
                      onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
                    })}
                    className={cn(errors.nombres && 'border-destructive')}
                  />
                </FormField>
                <FormField
                  label="Apellidos"
                  required
                  error={errors.apellidos?.message}
                  htmlFor="inst-ape"
                >
                  <Input
                    id="inst-ape"
                    {...register('apellidos', {
                      onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
                    })}
                    className={cn(errors.apellidos && 'border-destructive')}
                  />
                </FormField>
                <FormField label="Celular" htmlFor="inst-cel">
                  <Input id="inst-cel" {...register('celular')} />
                </FormField>
                <FormField
                  label="Tarifa por hora"
                  required
                  error={errors.tarifa?.message}
                  htmlFor="inst-tar"
                >
                  <Input
                    id="inst-tar"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('tarifa')}
                    className={cn(errors.tarifa && 'border-destructive')}
                  />
                </FormField>
                <FormField label="Email" error={errors.email?.message} htmlFor="inst-ema">
                  <Input
                    id="inst-ema"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    {...register('email')}
                    className={cn(errors.email && 'border-destructive')}
                  />
                </FormField>
                <FormField label="Fecha Nacimiento" htmlFor="inst-fnac">
                  <DatePicker
                    value={fechaNacimiento}
                    onChange={setFechaNacimiento}
                    placeholder="Seleccionar fecha"
                    maxYear={new Date().getFullYear()}
                  />
                </FormField>
              </div>

              {/* Especialidades con checkboxes */}
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Especialidades
                </label>
                {especialidades.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay especialidades registradas</p>
                ) : (
                  <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg border">
                    {especialidades.map((esp) => (
                      <label
                        key={esp.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded"
                      >
                        <Checkbox
                          checked={especialidadesSeleccionadas.includes(esp.id)}
                          onCheckedChange={() => toggleEspecialidad(esp.id)}
                        />
                        <span className="text-sm">{esp.nombre}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

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
          data={instructores}
          searchPlaceholder="Buscar instructores..."
          emptyMessage="No hay instructores registrados."
          pageSize={PAGE_SIZE.CATALOG}
        />
      </div>

      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        title={confirmToggle?.estado === 'A' ? '¿Inactivar instructor?' : '¿Activar instructor?'}
        description={`${confirmToggle?.nombres} ${confirmToggle?.apellidos} quedará ${confirmToggle?.estado === 'A' ? 'inactivo' : 'activo'}.`}
        confirmLabel={confirmToggle?.estado === 'A' ? 'Inactivar' : 'Activar'}
        variant={confirmToggle?.estado === 'A' ? 'destructive' : 'default'}
        onConfirm={handleToggle}
      />
    </div>
  );
}
