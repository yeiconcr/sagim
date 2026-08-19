import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, X, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/FormField';
import { DatePicker } from '@/components/shared/DatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/store/toastStore';
import type { Cliente } from '@/db/types';
import {
  createCliente,
  updateCliente,
  getNextInscripcion,
  clienteCedulaExiste,
} from '@/db/queries/clientes';
import { today, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// =============================================
// SCHEMA DE VALIDACIÓN
// =============================================
const schema = z.object({
  cedula: z
    .string()
    .min(1, 'La cédula es requerida')
    .regex(/^\d+$/, 'La cédula debe contener solo números')
    .max(15, 'Máximo 15 dígitos'),
  nombres: z.string().min(1, 'Los nombres son requeridos').max(100),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(100),
  direccion: z.string().min(1, 'La dirección es requerida').max(255),
  telefono: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  ciudad: z.string().optional(),
  sexo: z.enum(['1', '2'], { required_error: 'El sexo es requerido' }),
  fecha_inscripcion: z.string().optional(),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  estado: z.enum(['A', 'I']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  modo: 'nuevo' | 'editar';
  cliente?: Cliente;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function ClienteFormulario({ modo, cliente, onGuardar, onCancelar }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [inscripcionAuto, setInscripcionAuto] = useState<number | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoPath, setFotoPath] = useState<string | null>(cliente?.foto_path ?? null);
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    setError: setFormError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: cliente
      ? {
          cedula: cliente.cedula,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          direccion: cliente.direccion ?? '',
          telefono: cliente.telefono ?? '',
          celular: cliente.celular ?? '',
          email: cliente.email ?? '',
          ciudad: cliente.ciudad ?? 'PALMIRA',
          sexo: (cliente.sexo as '1' | '2') ?? undefined,
          fecha_inscripcion: cliente.fecha_inscripcion ?? today(),
          fecha_nacimiento: cliente.fecha_nacimiento ?? '',
          estado: cliente.estado,
        }
      : {
          ciudad: 'PALMIRA',
          estado: 'A',
          fecha_inscripcion: today(),
        },
  });

  // Calcular edad al cambiar fecha de nacimiento
  const fechaNac = watch('fecha_nacimiento');
  const edad = fechaNac
    ? Math.floor(
        (new Date().getTime() - new Date(fechaNac).getTime()) / (365.25 * 24 * 3600 * 1000)
      )
    : null;

  // Obtener número de inscripción automático para nuevo cliente
  useEffect(() => {
    if (modo === 'nuevo') {
      getNextInscripcion()
        .then(setInscripcionAuto)
        .catch(() => {});
    }
  }, [modo]);

  const onSubmit = async (data: FormValues) => {
    setGuardando(true);
    try {
      // Validar cédula duplicada antes de guardar
      if (modo === 'nuevo') {
        const cedulaExiste = await clienteCedulaExiste(data.cedula);
        if (cedulaExiste) {
          setFormError('cedula', {
            message: 'Esta cédula ya está registrada en el sistema',
          });
          error('Cliente duplicado', 'Ya existe un cliente con esta cédula.');
          setGuardando(false);
          return;
        }
      }

      if (modo === 'nuevo') {
        if (!inscripcionAuto) throw new Error('No se pudo obtener el consecutivo de inscripción.');
        await createCliente({
          inscripcion: inscripcionAuto,
          cedula: data.cedula,
          nombres: data.nombres.toUpperCase(),
          apellidos: data.apellidos.toUpperCase(),
          direccion: data.direccion || null,
          telefono: data.telefono || null,
          celular: data.celular || null,
          email: data.email || null,
          ciudad: data.ciudad || 'PALMIRA',
          sexo: data.sexo,
          fecha_inscripcion: data.fecha_inscripcion || today(),
          fecha_nacimiento: data.fecha_nacimiento || null,
          estado: data.estado,
          foto_path: fotoPath,
        });
        success(
          'Cliente creado',
          `${data.nombres} ${data.apellidos} registrado con inscripción #${inscripcionAuto}.`
        );
      } else if (cliente) {
        await updateCliente(cliente.cedula, {
          nombres: data.nombres.toUpperCase(),
          apellidos: data.apellidos.toUpperCase(),
          direccion: data.direccion || null,
          telefono: data.telefono || null,
          celular: data.celular || null,
          email: data.email || null,
          ciudad: data.ciudad || null,
          sexo: data.sexo,
          fecha_inscripcion: data.fecha_inscripcion || null,
          fecha_nacimiento: data.fecha_nacimiento || null,
          estado: data.estado,
          foto_path: fotoPath,
        });
        success('Cliente actualizado', `${data.nombres} ${data.apellidos} guardado.`);
      }
      onGuardar();
    } catch (err) {
      const msg = String(err);
      if (msg.includes('UNIQUE') || msg.includes('unique')) {
        error(
          'Cédula duplicada',
          'La cédula ingresada ya está registrada. Por favor verifique los datos.'
        );
      } else {
        error('Error al guardar', msg);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleSeleccionarFoto = async () => {
    // En producción Tauri usa dialog.open — aquí usamos input type=file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/bmp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFotoPreview(ev.target?.result as string);
        setFotoPath(file.name);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            title="Volver"
            aria-label="Volver"
            onClick={onCancelar}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {modo === 'nuevo'
                ? 'Nuevo Cliente'
                : `Editar: ${cliente?.nombres} ${cliente?.apellidos}`}
            </h1>
            {modo === 'nuevo' && inscripcionAuto && (
              <p className="text-sm text-slate-500">Inscripción #{inscripcionAuto}</p>
            )}
            {modo === 'editar' && cliente && (
              <p className="text-sm text-slate-500">Inscripción #{cliente.inscripcion}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ---- COLUMNA IZQUIERDA: foto + estado ---- */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">
                    Foto del cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="w-full aspect-[3/4] rounded-lg bg-slate-100 overflow-hidden relative flex items-center justify-center">
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : fotoPath ? (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <User className="w-12 h-12" />
                        <span className="text-xs text-center px-2 truncate w-full text-center">
                          {fotoPath}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <User className="w-16 h-16" />
                        <span className="text-xs">Sin foto</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleSeleccionarFoto}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Seleccionar imagen
                  </Button>
                  {fotoPath && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-red-500 hover:text-red-600"
                      onClick={() => {
                        setFotoPath(null);
                        setFotoPreview(null);
                      }}
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Quitar foto
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Estado */}
              <Card>
                <CardContent className="p-4">
                  <FormField label="Estado" error={errors.estado?.message}>
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
                  {edad !== null && edad > 0 && (
                    <p className="text-sm text-slate-500 mt-3">
                      Edad calculada: <strong>{edad} años</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ---- COLUMNA DERECHA: datos personales ---- */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Identificación */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">
                    Identificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Cédula / Doc. Identidad"
                    required
                    error={errors.cedula?.message}
                    htmlFor="cedula"
                  >
                    <Input
                      id="cedula"
                      {...register('cedula')}
                      disabled={modo === 'editar'}
                      placeholder="Número de cédula"
                      maxLength={15}
                      className={cn(
                        errors.cedula && 'border-destructive',
                        modo === 'editar' && 'bg-slate-50'
                      )}
                    />
                  </FormField>
                  <FormField label="Sexo" required error={errors.sexo?.message}>
                    <Controller
                      name="sexo"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(errors.sexo && 'border-destructive')}>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Masculino</SelectItem>
                            <SelectItem value="2">Femenino</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FormField
                    label="Nombres"
                    required
                    error={errors.nombres?.message}
                    htmlFor="nombres"
                  >
                    <Input
                      id="nombres"
                      {...register('nombres', {
                        onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
                      })}
                      placeholder="NOMBRES"
                      className={cn(errors.nombres && 'border-destructive')}
                    />
                  </FormField>
                  <FormField
                    label="Apellidos"
                    required
                    error={errors.apellidos?.message}
                    htmlFor="apellidos"
                  >
                    <Input
                      id="apellidos"
                      {...register('apellidos', {
                        onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
                      })}
                      placeholder="APELLIDOS"
                      className={cn(errors.apellidos && 'border-destructive')}
                    />
                  </FormField>
                  <FormField
                    label="Fecha de nacimiento"
                    required
                    error={errors.fecha_nacimiento?.message}
                    htmlFor="fecha_nacimiento"
                  >
                    <Controller
                      name="fecha_nacimiento"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Seleccionar fecha"
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Fecha de inscripción" htmlFor="fecha_inscripcion">
                    <Controller
                      name="fecha_inscripcion"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Seleccionar fecha"
                        />
                      )}
                    />
                  </FormField>
                </CardContent>
              </Card>

              {/* Contacto */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600">Contacto</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Dirección"
                    required
                    error={errors.direccion?.message}
                    htmlFor="direccion"
                    className="col-span-2"
                  >
                    <Input
                      id="direccion"
                      {...register('direccion')}
                      placeholder="Dirección completa"
                      className={cn(errors.direccion && 'border-destructive')}
                    />
                  </FormField>
                  <FormField label="Ciudad" htmlFor="ciudad">
                    <Input
                      id="ciudad"
                      {...register('ciudad', {
                        onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
                      })}
                      placeholder="PALMIRA"
                    />
                  </FormField>
                  <FormField label="Teléfono" htmlFor="telefono">
                    <Input
                      id="telefono"
                      {...register('telefono')}
                      placeholder="Teléfono fijo"
                      maxLength={10}
                    />
                  </FormField>
                  <FormField label="Celular" htmlFor="celular">
                    <Input
                      id="celular"
                      {...register('celular')}
                      placeholder="Número celular"
                      maxLength={10}
                    />
                  </FormField>
                  <FormField label="Email" error={errors.email?.message} htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="correo@ejemplo.com"
                      className={cn(errors.email && 'border-destructive')}
                    />
                  </FormField>
                </CardContent>
              </Card>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancelar}>
                  <X className="w-4 h-4 mr-1.5" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    guardando || (modo === 'editar' && !isDirty && fotoPath === cliente?.foto_path)
                  }
                >
                  {guardando ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      {modo === 'nuevo' ? 'Crear Cliente' : 'Guardar Cambios'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
