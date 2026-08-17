/**
 * Módulo Pagos a Instructores. Task 15.
 */
import { useState, useEffect, useCallback } from "react";
import { Plus, ArrowLeft, Save, X, UserCheck } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField } from "@/components/shared/FormField";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import type { PagoIns, Instructor, Especialidad } from "@/db/types";
import { getPagosInstructores, registrarPagoInstructor } from "@/db/queries/pagosIns";
import { getInstructores, getEspecialidades } from "@/db/queries/catalogos";
import { formatDate, formatCurrency, today, stripRtf } from "@/lib/utils";

type Vista = "lista" | "nuevo";

export function PagosInstructoresModule() {
  const [vista, setVista] = useState<Vista>("lista");
  const [pagos, setPagos] = useState<PagoIns[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  // Form
  const [idInstructor, setIdInstructor] = useState("");
  const [idEspecialidad, setIdEspecialidad] = useState("");
  const [periodoIni, setPeriodoIni] = useState(today());
  const [periodoFin, setPeriodoFin] = useState(today());
  const [valor, setValor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { success, error } = useToast();
  const { usuario } = useAuthStore();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, inst, esp] = await Promise.all([
        getPagosInstructores({ pageSize: 200 }),
        getInstructores(),
        getEspecialidades(),
      ]);
      setPagos(p.data);
      setInstructores(inst);
      setEspecialidades(esp);
    } catch (err) {
      error("Error", String(err));
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setIdInstructor(""); setIdEspecialidad(""); setPeriodoIni(today()); setPeriodoFin(today()); setValor(""); setObservaciones("");
    setVista("nuevo");
  };

  const handleGuardar = async () => {
    if (!idInstructor) { error("Falta instructor", "Seleccione un instructor."); return; }
    const val = Number(valor);
    if (isNaN(val) || val <= 0) { error("Valor inválido", "El valor debe ser mayor a cero."); return; }
    setGuardando(true);
    try {
      await registrarPagoInstructor({
        idInstructor: Number(idInstructor),
        idEspecialidad: idEspecialidad ? Number(idEspecialidad) : null,
        periodoIni, periodoFin, valor: val, observaciones,
        usuario: usuario?.nombre ?? "sistema",
      });
      success("Pago registrado", `Pago de ${formatCurrency(val)} registrado. Egreso creado en caja.`);
      setVista("lista");
      cargar();
    } catch (err) {
      error("Error", String(err));
    } finally {
      setGuardando(false);
    }
  };

  const totalPagado = pagos.reduce((s, p) => s + p.valor, 0);

  const columns: ColumnDef<PagoIns>[] = [
    { accessorKey: "fecha_pag", header: "Fecha", size: 100, cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span> },
    {
      accessorKey: "nombre_instructor", header: "Instructor",
      cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>() || "—"}</span>,
    },
    { accessorKey: "nombre_especialidad", header: "Especialidad", size: 130, cell: ({ getValue }) => <span className="text-sm">{getValue<string>() || "—"}</span> },
    {
      id: "periodo", header: "Período", size: 180,
      cell: ({ row }) => (
        <span className="text-sm text-slate-500">
          {formatDate(row.original.periodo_ini)} — {formatDate(row.original.periodo_fin)}
        </span>
      ),
    },
    { accessorKey: "valor", header: "Valor", size: 120, cell: ({ getValue }) => <span className="font-semibold text-sm tabular-nums">{formatCurrency(getValue<number>())}</span> },
    { accessorKey: "observaciones", header: "Observaciones", cell: ({ getValue }) => <span className="text-xs text-slate-500">{stripRtf(getValue<string>()) || "—"}</span> },
  ];

  if (vista === "nuevo") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setVista("lista")} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">Nuevo Pago a Instructor</h1>
        </div>

        <Card>
          <CardContent className="p-5 grid grid-cols-2 gap-4">
            <FormField label="Instructor" required className="col-span-2">
              <Select value={idInstructor} onValueChange={setIdInstructor}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar instructor..." /></SelectTrigger>
                <SelectContent>
                  {instructores.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.nombres} {i.apellidos}
                      {i.nombre_especialidad && <span className="text-xs text-slate-400 ml-1">· {i.nombre_especialidad}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Especialidad pagada">
              <Select value={idEspecialidad} onValueChange={setIdEspecialidad}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sin especialidad" /></SelectTrigger>
                <SelectContent>
                  {especialidades.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Valor ($)" required htmlFor="pi-val">
              <Input id="pi-val" type="number" min="0" step="1000" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" className="h-9" />
            </FormField>

            <FormField label="Período desde" htmlFor="pi-ini">
              <Input id="pi-ini" type="date" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} />
            </FormField>

            <FormField label="Período hasta" htmlFor="pi-fin">
              <Input id="pi-fin" type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} />
            </FormField>

            <FormField label="Observaciones" htmlFor="pi-obs" className="col-span-2">
              <Input id="pi-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Descripción del pago..." className="h-9" />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setVista("lista")}><X className="w-4 h-4 mr-1.5" />Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando || !idInstructor || !valor}>
            {guardando
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
              : <><Save className="w-4 h-4 mr-1.5" />Registrar Pago</>
            }
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <PageHeader
        title="Pagos a Instructores"
        description={`Total pagado: ${formatCurrency(totalPagado)}`}
        actions={<Button size="sm" onClick={abrirNuevo}><Plus className="w-4 h-4 mr-1.5" />Nuevo Pago</Button>}
      />
      {loading ? <PageLoading text="Cargando pagos..." /> : (
        <DataTable columns={columns} data={pagos} searchPlaceholder="Buscar instructor..." emptyMessage="No hay pagos registrados." pageSize={20} />
      )}
    </div>
  );
}
