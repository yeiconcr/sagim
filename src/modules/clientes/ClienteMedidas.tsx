/**
 * ClienteMedidas — historial de medidas corporales con gráfica de evolución.
 * Equivalente a frmMedidas del VB6. Task 7.
 */
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Printer, TrendingUp, Scale, Ruler, Save, X, Pencil, Trash2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import type { Cliente, Medida } from "@/db/types";
import {
  getMedidasByInscripcion, createMedida, updateMedida, deleteMedida,
} from "@/db/queries/clientes";
import { formatDate, today } from "@/lib/utils";
import { cn } from "@/lib/utils";

// =============================================
// SCHEMA
// =============================================
const medidaSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  peso: z.coerce.number().min(0).max(500).optional(),
  talla: z.coerce.number().min(0).max(300).optional(),
  cintura: z.coerce.number().min(0).max(300).optional(),
  brazos: z.coerce.number().min(0).max(200).optional(),
  muslos: z.coerce.number().min(0).max(300).optional(),
  pantorrilla: z.coerce.number().min(0).max(200).optional(),
  torax: z.coerce.number().min(0).max(300).optional(),
  cadera: z.coerce.number().min(0).max(300).optional(),
  estatura: z.coerce.number().min(0).max(300).optional(),
});

type MedidaForm = z.infer<typeof medidaSchema>;

const CAMPOS_MEDIDA: Array<{ key: keyof MedidaForm; label: string; icon?: React.ElementType }> = [
  { key: "peso", label: "Peso (kg)", icon: Scale },
  { key: "estatura", label: "Estatura (cm)", icon: Ruler },
  { key: "talla", label: "Talla (cm)" },
  { key: "cintura", label: "Cintura (cm)" },
  { key: "brazos", label: "Brazos (cm)" },
  { key: "muslos", label: "Muslos (cm)" },
  { key: "pantorrilla", label: "Pantorrilla (cm)" },
  { key: "torax", label: "Torax (cm)" },
  { key: "cadera", label: "Cadera (cm)" },
];

// =============================================
// SUBCOMPONENTE: Formulario de medida
// =============================================
interface FormMedidaProps {
  inscripcion: number;
  medidaEditar?: Medida | null;
  onGuardar: () => void;
  onCancelar: () => void;
}

function FormMedida({ inscripcion, medidaEditar, onGuardar, onCancelar }: FormMedidaProps) {
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<MedidaForm>({
    resolver: zodResolver(medidaSchema),
    defaultValues: medidaEditar
      ? {
          fecha: medidaEditar.fecha,
          peso: medidaEditar.peso ?? undefined,
          talla: medidaEditar.talla ?? undefined,
          cintura: medidaEditar.cintura ?? undefined,
          brazos: medidaEditar.brazos ?? undefined,
          muslos: medidaEditar.muslos ?? undefined,
          pantorrilla: medidaEditar.pantorrilla ?? undefined,
          torax: medidaEditar.torax ?? undefined,
          cadera: medidaEditar.cadera ?? undefined,
          estatura: medidaEditar.estatura ?? undefined,
        }
      : { fecha: today() },
  });

  const onSubmit = async (data: MedidaForm) => {
    setGuardando(true);
    try {
      if (medidaEditar) {
        await updateMedida(medidaEditar.id, {
          fecha: data.fecha,
          peso: data.peso ?? null,
          talla: data.talla ?? null,
          cintura: data.cintura ?? null,
          brazos: data.brazos ?? null,
          muslos: data.muslos ?? null,
          pantorrilla: data.pantorrilla ?? null,
          torax: data.torax ?? null,
          cadera: data.cadera ?? null,
          estatura: data.estatura ?? null,
        });
        success("Medidas actualizadas");
      } else {
        await createMedida({
          inscripcion,
          fecha: data.fecha,
          peso: data.peso ?? null,
          talla: data.talla ?? null,
          cintura: data.cintura ?? null,
          brazos: data.brazos ?? null,
          muslos: data.muslos ?? null,
          pantorrilla: data.pantorrilla ?? null,
          torax: data.torax ?? null,
          cadera: data.cadera ?? null,
          estatura: data.estatura ?? null,
        });
        success("Medidas registradas");
      }
      onGuardar();
    } catch (err) {
      error("Error al guardar medidas", String(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600">
          {medidaEditar ? "Editar medición" : "Nueva medición"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <FormField label="Fecha" required error={errors.fecha?.message} className="col-span-3 sm:col-span-1" htmlFor="m-fecha">
              <Input id="m-fecha" type="date" {...register("fecha")} className={cn(errors.fecha && "border-destructive")} />
            </FormField>
            {CAMPOS_MEDIDA.map(({ key, label }) => (
              <FormField key={key} label={label} htmlFor={`m-${key}`}>
                <Input
                  id={`m-${key}`}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(key)}
                  placeholder="0.00"
                  className="text-right"
                />
              </FormField>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={guardando}>
              {guardando
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Save className="w-3.5 h-3.5 mr-1" /> Guardar</>
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
interface Props {
  cliente: Cliente;
  onVolver: () => void;
}

export function ClienteMedidas({ cliente, onVolver }: Props) {
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [medidaEditar, setMedidaEditar] = useState<Medida | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Medida | null>(null);
  const { success, error } = useToast();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMedidasByInscripcion(cliente.inscripcion);
      setMedidas(data);
    } catch (err) {
      error("Error", String(err));
    } finally {
      setLoading(false);
    }
  }, [cliente.inscripcion, error]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMedida(confirmDelete.id);
      success("Medición eliminada");
      cargar();
    } catch (err) {
      error("Error", String(err));
    } finally {
      setConfirmDelete(null);
    }
  };

  // Datos para la gráfica
  const datosGrafica = medidas.map((m) => ({
    fecha: m.fecha,
    Peso: m.peso ?? null,
    Cintura: m.cintura ?? null,
    Cadera: m.cadera ?? null,
  }));

  const columns: ColumnDef<Medida>[] = [
    {
      accessorKey: "fecha",
      header: "Fecha",
      size: 100,
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    ...CAMPOS_MEDIDA.map(({ key, label }) => ({
      accessorKey: key as string,
      header: label.split(" ")[0],
      size: 80,
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const v = getValue() as number | null;
        return <span className="text-sm tabular-nums text-right block">{v != null && v > 0 ? v.toFixed(1) : "—"}</span>;
      },
    })),
    {
      id: "acciones",
      header: "",
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setMedidaEditar(row.original); setMostrarFormulario(true); }}
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(row.original); }}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onVolver} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Trazabilidad de Medidas</h1>
            <p className="text-sm text-slate-500">
              {cliente.nombres} {cliente.apellidos} — Inscripción #{cliente.inscripcion}
            </p>
          </div>
        </div>
        {!mostrarFormulario && (
          <Button
            size="sm"
            onClick={() => { setMedidaEditar(null); setMostrarFormulario(true); }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Medición
          </Button>
        )}
      </div>

      {/* Formulario inline */}
      {mostrarFormulario && (
        <div className="mb-6">
          <FormMedida
            inscripcion={cliente.inscripcion}
            medidaEditar={medidaEditar}
            onGuardar={() => { setMostrarFormulario(false); setMedidaEditar(null); cargar(); }}
            onCancelar={() => { setMostrarFormulario(false); setMedidaEditar(null); }}
          />
        </div>
      )}

      {loading ? (
        <PageLoading text="Cargando medidas..." />
      ) : (
        <Tabs defaultValue="tabla" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tabla">
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              Historial ({medidas.length})
            </TabsTrigger>
            <TabsTrigger value="grafica" disabled={medidas.length < 2}>
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Evolución
            </TabsTrigger>
          </TabsList>

          {/* HISTORIAL */}
          <TabsContent value="tabla">
            {medidas.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-slate-400">
                  <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay medidas registradas para este cliente.</p>
                  <Button
                    variant="outline" size="sm" className="mt-4"
                    onClick={() => setMostrarFormulario(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Registrar primera medición
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div style={{ height: "400px" }}>
                <DataTable
                  columns={columns}
                  data={[...medidas].reverse()} // más reciente primero
                  showSearch={false}
                  pageSize={10}
                  emptyMessage="Sin medidas registradas."
                />
              </div>
            )}
          </TabsContent>

          {/* GRÁFICA */}
          <TabsContent value="grafica">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Evolución de medidas corporales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={datosGrafica} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={(v) => formatDate(v).substring(0, 5)}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      formatter={(value, name) => [`${value} cm/kg`, name]}
                      labelFormatter={(label) => `Fecha: ${formatDate(String(label))}`}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone" dataKey="Peso" stroke="#3b82f6"
                      strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}
                      connectNulls
                    />
                    <Line
                      type="monotone" dataKey="Cintura" stroke="#f59e0b"
                      strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
                      connectNulls strokeDasharray="4 2"
                    />
                    <Line
                      type="monotone" dataKey="Cadera" stroke="#ec4899"
                      strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
                      connectNulls strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-400 text-center mt-2">
                  Mostrando: Peso (azul), Cintura (amarillo), Cadera (rosa)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="¿Eliminar medición?"
        description={`Se eliminará la medición del ${confirmDelete ? formatDate(confirmDelete.fecha) : ""}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleEliminar}
      />
    </div>
  );
}
