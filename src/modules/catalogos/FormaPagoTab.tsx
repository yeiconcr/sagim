import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/store/toastStore';
import type { FormaPago } from '@/db/types';
import {
  getFormasPago,
  createFormaPago,
  updateFormaPago,
  toggleFormaPagoEstado,
  formaPagoDetalleExiste,
} from '@/db/queries/catalogos';
import { cn } from '@/lib/utils';

const schema = z.object({
  detalle: z.string().min(1, 'Nombre requerido'),
  plazo_dias: z.coerce.number().min(0).max(365),
});
type FormValues = z.infer<typeof schema>;

export function FormaPagoTab() {
  const [formas, setFormas] = useState<FormaPago[]>([]);
  const [editando, setEditando] = useState<FormaPago | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const { success, error } = useToast();

  const cargar = useCallback(async () => setFormas(await getFormasPago(false)), []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plazo_dias: 0 },
  });

  const abrirNuevo = () => {
    reset({ plazo_dias: 0 });
    setEditando(null);
    setMostrarForm(true);
  };
  const abrirEditar = (f: FormaPago) => {
    reset({ detalle: f.detalle, plazo_dias: f.plazo_dias });
    setEditando(f);
    setMostrarForm(true);
  };
  const cerrar = () => {
    setMostrarForm(false);
    setEditando(null);
    reset();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Validar duplicado por nombre
      const existe = await formaPagoDetalleExiste(data.detalle.trim(), editando?.id);
      if (existe) {
        error('Duplicado', 'Ya existe una forma de pago con esta descripción');
        return;
      }

      if (editando) {
        await updateFormaPago(editando.id, data.detalle.trim(), data.plazo_dias);
        success('Forma de pago actualizada');
      } else {
        await createFormaPago(data.detalle.trim(), data.plazo_dias);
        success('Forma de pago creada');
      }
      cerrar();
      cargar();
    } catch (err) {
      error('Error', String(err));
    }
  };

  const handleToggle = async (f: FormaPago) => {
    try {
      await toggleFormaPagoEstado(f.id, f.estado === 'A' ? 'I' : 'A');
      success(f.estado === 'A' ? 'Forma de pago inactivada' : 'Forma de pago activada');
      cargar();
    } catch (err) {
      error('Error', String(err));
    }
  };

  const columns: ColumnDef<FormaPago>[] = [
    {
      accessorKey: 'detalle',
      header: 'Descripción',
      size: 200,
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'plazo_dias',
      header: 'Plazo (días)',
      size: 120,
      cell: ({ getValue }) => {
        const d = getValue<number>();
        return <span className="text-sm">{d === 0 ? 'Contado' : `${d} días`}</span>;
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 90,
      cell: ({ getValue }) => (
        <Badge variant={getValue<string>() === 'A' ? 'success' : 'secondary'} className="text-xs">
          {getValue<string>() === 'A' ? 'ACTIVA' : 'INACTIVA'}
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
        <p className="text-sm text-slate-500">{formas.length} formas de pago</p>
        {!mostrarForm && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Forma de Pago
          </Button>
        )}
      </div>
      {mostrarForm && (
        <div className="flex items-end gap-3 p-4 bg-white rounded-lg border flex-wrap flex-shrink-0">
          <FormField
            label="Descripción"
            error={errors.detalle?.message}
            htmlFor="fp-det"
            className="flex-1 min-w-[200px]"
          >
            <Input
              id="fp-det"
              {...register('detalle')}
              placeholder="Ej: Efectivo, Tarjeta, Crédito 30 días"
              className={cn(errors.detalle && 'border-destructive')}
              autoFocus
            />
          </FormField>
          <FormField
            label="Plazo en días"
            error={errors.plazo_dias?.message}
            htmlFor="fp-pla"
            className="w-36"
          >
            <Input
              id="fp-pla"
              type="number"
              min="0"
              {...register('plazo_dias')}
              className={cn(errors.plazo_dias && 'border-destructive')}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleSubmit(onSubmit)}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {editando ? 'Guardar' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={cerrar}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-400 flex-shrink-0">
        💡 El <strong>Plazo</strong> indica días de crédito. 0 = pago de contado.
      </p>
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={formas}
          searchPlaceholder="Buscar..."
          onRowClick={abrirEditar}
          emptyMessage="No hay formas de pago."
          pageSize={PAGE_SIZE.CATALOG}
        />
      </div>
    </div>
  );
}
