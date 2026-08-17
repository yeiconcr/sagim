/**
 * Módulo Reportes — Hub central con los 15 reportes del sistema.
 * Flujo: seleccionar reporte → configurar filtros → preview PDF → imprimir/guardar.
 * Task 17.
 */
import { useState, useCallback, lazy, Suspense } from "react";
import { PDFViewer, usePDF } from "@react-pdf/renderer";
import {
  FileText, Users, Package, BarChart2, Wallet, TrendingUp,
  Truck, CreditCard, UserCheck, Calendar, Scale, ArrowLeft,
  Printer, Download, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { PageLoading } from "@/components/shared/LoadingSpinner";
import { useToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import { getParametros } from "@/db/queries/configuracion";
import { getClientes } from "@/db/queries/clientes";
import { getInventario, getKardexByArticulo } from "@/db/queries/inventario";
import { getRecibos, getDetReciboPorNro, getFacturasTienda, getDetFacturaTiendaPorNro } from "@/db/queries/ventas";
import { getMovimientosCaja } from "@/db/queries/caja";
import { getCompras } from "@/db/queries/compras";
import { getPagosInstructores } from "@/db/queries/pagosIns";
import { getMedidasByInscripcion, getClienteByCedula } from "@/db/queries/clientes";
import { getPagosByInscripcion } from "@/db/queries/clientes";
import {
  ReciboGymPDF, FacturaTiendaPDF, FichaClientePDF, ListadoClientesPDF,
  InventarioPDF, KardexPDF, TrazabilidadMedidasPDF,
  MovimientoCajaPDF, VentasDiariasPDF, ComprasRealizadasPDF,
  CuentasPorPagarPDF, EgresosPDF, CobrosRealizadosPDF, ReciboInstructorPDF,
} from "@/components/pdf/reportes";
import { formatDate, formatCurrency, today, exportToExcel } from "@/lib/utils";
import type { Parametros } from "@/db/types";

// =============================================
// CATÁLOGO DE REPORTES
// =============================================
interface ReporteConfig {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  categoria: string;
  filtros: Array<"fechaDesde" | "fechaHasta" | "cedula" | "codigoArticulo" | "estado">;
}

const REPORTES: ReporteConfig[] = [
  { id: "listado-clientes", titulo: "Listado de Clientes", descripcion: "Todos los clientes registrados", icono: Users, categoria: "Clientes", filtros: ["estado"] },
  { id: "ficha-cliente", titulo: "Ficha de Inscripción", descripcion: "Ficha personal de un cliente con medidas", icono: FileText, categoria: "Clientes", filtros: ["cedula"] },
  { id: "trazabilidad-medidas", titulo: "Trazabilidad de Medidas", descripcion: "Historial de medidas corporales por cliente", icono: Scale, categoria: "Clientes", filtros: ["cedula"] },
  { id: "inventario", titulo: "Inventario de Productos", descripcion: "Stock y precios de todos los artículos", icono: Package, categoria: "Inventario", filtros: ["estado"] },
  { id: "kardex", titulo: "Kárdex de Artículos", descripcion: "Movimientos de un artículo por período", icono: BarChart2, categoria: "Inventario", filtros: ["codigoArticulo", "fechaDesde", "fechaHasta"] },
  { id: "ventas-diarias", titulo: "Ventas Diarias", descripcion: "Recibos gym + facturas tienda del período", icono: TrendingUp, categoria: "Ventas", filtros: ["fechaDesde", "fechaHasta"] },
  { id: "movimiento-caja", titulo: "Movimiento de Caja", descripcion: "Todos los movimientos financieros del período", icono: Wallet, categoria: "Finanzas", filtros: ["fechaDesde", "fechaHasta"] },
  { id: "egresos", titulo: "Egresos", descripcion: "Solo movimientos de salida del período", icono: TrendingUp, categoria: "Finanzas", filtros: ["fechaDesde", "fechaHasta"] },
  { id: "cobros-realizados", titulo: "Cobros Realizados", descripcion: "Pagos recibidos de clientes en el período", icono: CreditCard, categoria: "Finanzas", filtros: ["fechaDesde", "fechaHasta"] },
  { id: "compras-realizadas", titulo: "Compras Realizadas", descripcion: "Compras a proveedores del período", icono: Truck, categoria: "Compras", filtros: ["fechaDesde", "fechaHasta"] },
  { id: "cuentas-por-pagar", titulo: "Cuentas por Pagar", descripcion: "Saldos pendientes con proveedores", icono: CreditCard, categoria: "Compras", filtros: [] },
  { id: "pagos-instructores", titulo: "Recibo Pago Instructor", descripcion: "Comprobante de pago a un instructor", icono: UserCheck, categoria: "Instructores", filtros: ["fechaDesde", "fechaHasta"] },
];

// =============================================
// MÓDULO PRINCIPAL
// =============================================
type Estado = "lista" | "configurar" | "preview";

export function ReportesModule() {
  const [estado, setEstado] = useState<Estado>("lista");
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteConfig | null>(null);
  const [generando, setGenerando] = useState(false);
  const [docElement, setDocElement] = useState<React.ReactElement | null>(null);
  // Filtros
  const [fechaDesde, setFechaDesde] = useState(today());
  const [fechaHasta, setFechaHasta] = useState(today());
  const [cedula, setCedula] = useState("");
  const [codigoArticulo, setCodigoArticulo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"A" | "I" | "todos">("A");
  const { error } = useToast();
  const { usuario } = useAuthStore();

  const seleccionarReporte = (r: ReporteConfig) => {
    setReporteSeleccionado(r);
    setEstado("configurar");
    setDocElement(null);
  };

  const descargarExcel = useCallback(async () => {
    if (!reporteSeleccionado) return;
    setGenerando(true);
    try {
      let headers: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: any[][] = [];
      const filename = `${reporteSeleccionado.id}_${today()}.xlsx`;

      switch (reporteSeleccionado.id) {
        case "listado-clientes": {
          const result = await getClientes({ pageSize: 99999, estado: filtroEstado });
          headers = ["Cédula", "Nombres", "Apellidos", "Sexo", "Teléfono", "Email", "Inscripción", "Estado"];
          rows = result.data.map(c => [c.cedula, c.nombres, c.apellidos, c.sexo, c.telefono, c.email, c.fecha_inscripcion, c.estado === "A" ? "Activo" : "Inactivo"]);
          break;
        }
        case "inventario": {
          const result = await getInventario({ pageSize: 99999, estado: filtroEstado });
          headers = ["Código", "Nombre", "Stock", "Precio Compra", "Precio Venta", "Estado"];
          rows = result.data.map(a => [a.codigo, a.nombre, a.stock, a.precio_compra, a.precio_venta, a.estado === "A" ? "Activo" : "Inactivo"]);
          break;
        }
        case "cuentas-por-pagar": {
          const { getCtasPorPagar } = await import("@/db/queries/compras");
          const cuentas = await getCtasPorPagar(false);
          headers = ["Proveedor", "Fecha Doc", "Vencimiento", "Importe", "Pagado", "Saldo", "Estado"];
          rows = cuentas.map(c => [c.nombre_proveedor, c.fecha_doc, c.fecha_ven, c.importe, c.pagado, c.saldo, c.estado === "P" ? "PENDIENTE" : "CANCELADA"]);
          break;
        }
        case "ventas-diarias": {
          const [recibos, facturas] = await Promise.all([
            getRecibos({ pageSize: 99999, fechaDesde, fechaHasta, estado: "A" }),
            getFacturasTienda({ pageSize: 99999, fechaDesde, fechaHasta, estado: "A" }),
          ]);
          headers = ["Tipo", "Nro Documento", "Fecha", "Cliente", "Total"];
          rows = [
            ...recibos.data.map(r => ["Recibo Gym", String(r.nro_docu), r.fecha, r.nombre_cliente || r.cedula, r.total]),
            ...facturas.data.map(f => ["Factura Tienda", String(f.nro_docu), f.fecha, f.nombre_cliente || f.cedula, f.total])
          ].sort((a, b) => String(a[2]).localeCompare(String(b[2])));
          break;
        }
        case "movimiento-caja": {
          const result = await getMovimientosCaja({ pageSize: 99999, fechaDesde, fechaHasta });
          headers = ["Fecha", "Referencia", "Concepto", "Tipo", "Valor"];
          rows = result.data.map(m => [m.fecha, m.referencia, m.concepto, m.natural === "I" ? "INGRESO" : "EGRESO", m.valor]);
          break;
        }
        case "egresos": {
          const result = await getMovimientosCaja({ pageSize: 99999, fechaDesde, fechaHasta });
          const egresos = result.data.filter(m => m.natural === "E");
          headers = ["Fecha", "Referencia", "Concepto", "Valor"];
          rows = egresos.map(m => [m.fecha, m.referencia, m.concepto, m.valor]);
          break;
        }
        case "cobros-realizados": {
          const result = await getRecibos({ pageSize: 99999, fechaDesde, fechaHasta, estado: "A" });
          headers = ["Nro Recibo", "Fecha", "Cliente", "Cédula", "Total"];
          rows = result.data.map(r => [r.nro_docu, r.fecha, r.nombre_cliente, r.cedula, r.total]);
          break;
        }
        case "compras-realizadas": {
          const result = await getCompras({ pageSize: 99999, fechaDesde, fechaHasta });
          headers = ["Nro Compra", "Fecha", "Proveedor", "Doc Ref", "Forma Pago", "Total"];
          rows = result.data.map(c => [c.nro_compra, c.fecha, c.nombre_proveedor, c.nro_documento, c.nombre_forma_pago, c.total]);
          break;
        }
        case "pagos-instructores": {
          const result = await getPagosInstructores({ pageSize: 99999, fechaDesde, fechaHasta });
          headers = ["Fecha Pago", "Instructor", "Especialidad", "Periodo Ini", "Periodo Fin", "Valor"];
          rows = result.data.map(p => [p.fecha_pag, p.nombre_instructor, p.nombre_especialidad, p.periodo_ini, p.periodo_fin, p.valor]);
          break;
        }
        case "kardex": {
          if (!codigoArticulo.trim()) { error("Falta código", "Ingrese el código del artículo."); setGenerando(false); return; }
          const { getArticuloByCodigo } = await import("@/db/queries/inventario");
          const art = await getArticuloByCodigo(codigoArticulo.trim());
          if (!art) { error("No encontrado", "No existe artículo."); setGenerando(false); return; }
          const kardex = await getKardexByArticulo(codigoArticulo.trim(), fechaDesde, fechaHasta);
          headers = ["Fecha", "Detalle", "Cant. Entrada", "Val. Entrada", "Cant. Salida", "Val. Salida", "Saldo"];
          rows = kardex.map(k => [k.fecha, k.detalle, k.cantidad_in > 0 ? `+${k.cantidad_in}` : "", k.total_in > 0 ? k.total_in : "", k.cantidad_sa > 0 ? `-${k.cantidad_sa}` : "", k.total_sa > 0 ? k.total_sa : "", k.saldo]);
          break;
        }
        default:
          error("Exportación no soportada", "Este reporte no soporta exportación a Excel.");
          setGenerando(false);
          return;
      }

      await exportToExcel(filename, headers, rows);

    } catch (err) {
      error("Error al exportar", String(err));
    } finally {
      setGenerando(false);
    }
  }, [reporteSeleccionado, fechaDesde, fechaHasta, cedula, codigoArticulo, filtroEstado, error]);

  const generarReporte = useCallback(async () => {
    if (!reporteSeleccionado) return;
    setGenerando(true);
    try {
      const params = await getParametros();
      const paramsBase = {
        gimnasio: params?.nombre_gimnasio ?? "SAGIM",
        nit: params?.nit,
        direccion: params?.direccion,
        telefono: params?.telefono,
        generadoPor: usuario?.nombre,
      };

      let doc: React.ReactElement | null = null;

      switch (reporteSeleccionado.id) {
        case "listado-clientes": {
          const result = await getClientes({ pageSize: 9999, estado: filtroEstado });
          doc = <ListadoClientesPDF {...paramsBase} clientes={result.data} filtro={filtroEstado === "A" ? "Activos" : filtroEstado === "I" ? "Inactivos" : "Todos"} />;
          break;
        }

        case "ficha-cliente": {
          if (!cedula.trim()) { error("Falta cédula", "Ingrese la cédula del cliente."); setGenerando(false); return; }
          const cliente = await getClienteByCedula(cedula.trim());
          if (!cliente) { error("No encontrado", `No existe cliente con cédula ${cedula}`); setGenerando(false); return; }
          const [medidas, pagos] = await Promise.all([
            getMedidasByInscripcion(cliente.inscripcion),
            getPagosByInscripcion(cliente.inscripcion),
          ]);
          const ultimaMedida = medidas.length > 0 ? medidas[medidas.length - 1] : null;
          doc = <FichaClientePDF
            {...paramsBase}
            inscripcion={cliente.inscripcion}
            cedula={cliente.cedula}
            nombres={cliente.nombres}
            apellidos={cliente.apellidos}
            sexo={cliente.sexo}
            ciudad={cliente.ciudad}
            direccionCliente={cliente.direccion}
            telefono1={cliente.telefono}
            celular={cliente.celular}
            email={cliente.email}
            fechaInscripcion={cliente.fecha_inscripcion}
            fechaNacimiento={cliente.fecha_nacimiento}
            estado={cliente.estado}
            ultimaMedida={ultimaMedida}
            ultimosPagos={pagos.slice(0, 5)}
          />;
          break;
        }

        case "trazabilidad-medidas": {
          if (!cedula.trim()) { error("Falta cédula", "Ingrese la cédula del cliente."); setGenerando(false); return; }
          const cliente = await getClienteByCedula(cedula.trim());
          if (!cliente) { error("No encontrado", `No existe cliente con cédula ${cedula}`); setGenerando(false); return; }
          const medidas = await getMedidasByInscripcion(cliente.inscripcion);
          doc = <TrazabilidadMedidasPDF
            {...paramsBase}
            cliente={`${cliente.nombres} ${cliente.apellidos}`}
            cedula={cliente.cedula}
            inscripcion={cliente.inscripcion}
            medidas={medidas}
          />;
          break;
        }

        case "inventario": {
          const result = await getInventario({ pageSize: 9999, estado: filtroEstado });
          doc = <InventarioPDF {...paramsBase} articulos={result.data} />;
          break;
        }

        case "kardex": {
          if (!codigoArticulo.trim()) { error("Falta código", "Ingrese el código del artículo."); setGenerando(false); return; }
          const { getArticuloByCodigo } = await import("@/db/queries/inventario");
          const art = await getArticuloByCodigo(codigoArticulo.trim());
          if (!art) { error("No encontrado", `No existe artículo con código ${codigoArticulo}`); setGenerando(false); return; }
          const kardex = await getKardexByArticulo(codigoArticulo.trim(), fechaDesde, fechaHasta);
          doc = <KardexPDF {...paramsBase} articulo={art.nombre} codigo={art.codigo} stockActual={art.stock} kardex={kardex} fechaDesde={fechaDesde} fechaHasta={fechaHasta} />;
          break;
        }

        case "ventas-diarias": {
          const [recibos, facturas] = await Promise.all([
            getRecibos({ pageSize: 9999, fechaDesde, fechaHasta, estado: "A" }),
            getFacturasTienda({ pageSize: 9999, fechaDesde, fechaHasta, estado: "A" }),
          ]);
          const totalRecibos = recibos.data.reduce((s, r) => s + (r.total ?? 0), 0);
          const totalFacturas = facturas.data.reduce((s, f) => s + f.total, 0);
          doc = <VentasDiariasPDF
            {...paramsBase}
            titulo="VENTAS DIARIAS"
            subtitulo={`Período: ${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`}
            orientation="landscape"
            headers={[
              { label: "Tipo", key: "tipo", width: 60 },
              { label: "N° Documento", key: "nro_docu", width: 80 },
              { label: "Fecha", key: "fecha", width: 70 },
              { label: "Cliente", key: "nombre_cliente" },
              { label: "Total", key: "total", width: 90, align: "right" },
            ]}
            data={[
              ...recibos.data.map(r => ({ tipo: "Recibo Gym", nro_docu: String(r.nro_docu).padStart(6, "0"), fecha: r.fecha, nombre_cliente: r.nombre_cliente || r.cedula || "—", total: r.total ?? 0 })),
              ...facturas.data.map(f => ({ tipo: "Factura Tienda", nro_docu: String(f.nro_docu).padStart(6, "0"), fecha: f.fecha, nombre_cliente: f.nombre_cliente || f.cedula || "—", total: f.total })),
            ].sort((a, b) => a.fecha.localeCompare(b.fecha))}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "fecha") return formatDate(row.fecha as string);
              if (key === "total") return formatCurrency(row.total as number);
              return String(row[key] ?? "—");
            }}
            totales={{ "Total Recibos Gym": totalRecibos, "Total Facturas Tienda": totalFacturas, "TOTAL GENERAL": totalRecibos + totalFacturas }}
          />;
          break;
        }

        case "movimiento-caja": {
          const result = await getMovimientosCaja({ pageSize: 9999, fechaDesde, fechaHasta });
          const totalI = result.data.filter(m => m.natural === "I").reduce((s, m) => s + m.valor, 0);
          const totalE = result.data.filter(m => m.natural === "E").reduce((s, m) => s + m.valor, 0);
          doc = <MovimientoCajaPDF
            {...paramsBase}
            titulo="MOVIMIENTO DE CAJA"
            subtitulo={`Período: ${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`}
            orientation="landscape"
            headers={[
              { label: "Fecha", key: "fecha", width: 70 },
              { label: "Referencia", key: "referencia", width: 80 },
              { label: "Concepto", key: "concepto" },
              { label: "Tipo", key: "natural", width: 55, align: "center" },
              { label: "Valor", key: "valor", width: 90, align: "right" },
            ]}
            data={result.data}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "fecha") return formatDate(row.fecha as string);
              if (key === "valor") return formatCurrency(row.valor as number);
              if (key === "natural") return row.natural === "I" ? "INGRESO" : "EGRESO";
              return String(row[key] ?? "—");
            }}
            totales={{ "Total Ingresos": totalI, "Total Egresos": totalE, "Saldo": totalI - totalE }}
          />;
          break;
        }

        case "egresos": {
          const result = await getMovimientosCaja({ pageSize: 9999, fechaDesde, fechaHasta });
          const egresos = result.data.filter(m => m.natural === "E");
          const totalE = egresos.reduce((s, m) => s + m.valor, 0);
          doc = <EgresosPDF
            {...paramsBase}
            titulo="REPORTE DE EGRESOS"
            subtitulo={`Período: ${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`}
            headers={[
              { label: "Fecha", key: "fecha", width: 80 },
              { label: "Referencia", key: "referencia", width: 90 },
              { label: "Concepto", key: "concepto" },
              { label: "Valor", key: "valor", width: 100, align: "right" },
            ]}
            data={egresos}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "fecha") return formatDate(row.fecha as string);
              if (key === "valor") return formatCurrency(row.valor as number);
              return String(row[key] ?? "—");
            }}
            totales={{ "TOTAL EGRESOS": totalE }}
          />;
          break;
        }

        case "cobros-realizados": {
          const result = await getRecibos({ pageSize: 9999, fechaDesde, fechaHasta, estado: "A" });
          const total = result.data.reduce((s, r) => s + (r.total ?? 0), 0);
          doc = <CobrosRealizadosPDF
            {...paramsBase}
            titulo="COBROS REALIZADOS"
            subtitulo={`Período: ${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`}
            headers={[
              { label: "N° Recibo", key: "nro_docu", width: 80 },
              { label: "Fecha", key: "fecha", width: 80 },
              { label: "Cliente", key: "nombre_cliente" },
              { label: "Cédula", key: "cedula", width: 90 },
              { label: "Total", key: "total", width: 100, align: "right" },
            ]}
            data={result.data}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "nro_docu") return String(row.nro_docu as number).padStart(6, "0");
              if (key === "fecha") return formatDate(row.fecha as string);
              if (key === "total") return formatCurrency(row.total as number ?? 0);
              return String(row[key] ?? "—");
            }}
            totales={{ "TOTAL COBRADO": total }}
          />;
          break;
        }

        case "compras-realizadas": {
          const result = await getCompras({ pageSize: 9999, fechaDesde, fechaHasta });
          const total = result.data.reduce((s, c) => s + c.total, 0);
          doc = <ComprasRealizadasPDF
            {...paramsBase}
            titulo="COMPRAS REALIZADAS"
            subtitulo={`Período: ${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`}
            orientation="landscape"
            headers={[
              { label: "N° Compra", key: "nro_compra", width: 80 },
              { label: "Fecha", key: "fecha", width: 70 },
              { label: "Proveedor", key: "nombre_proveedor" },
              { label: "Doc. Ref.", key: "nro_documento", width: 90 },
              { label: "Forma Pago", key: "nombre_forma_pago", width: 90 },
              { label: "Total", key: "total", width: 90, align: "right" },
            ]}
            data={result.data}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "nro_compra") return String(row.nro_compra as number).padStart(6, "0");
              if (key === "fecha") return formatDate(row.fecha as string);
              if (key === "total") return formatCurrency(row.total as number);
              return String(row[key] ?? "—");
            }}
            totales={{ "TOTAL COMPRAS": total }}
          />;
          break;
        }

        case "cuentas-por-pagar": {
          const { getCtasPorPagar } = await import("@/db/queries/compras");
          const cuentas = await getCtasPorPagar(false);
          const total = cuentas.filter(c => c.estado === "P").reduce((s, c) => s + c.saldo, 0);
          doc = <CuentasPorPagarPDF
            {...paramsBase}
            titulo="CUENTAS POR PAGAR"
            subtitulo="Saldos pendientes con proveedores"
            headers={[
              { label: "Proveedor", key: "nombre_proveedor" },
              { label: "Fecha Doc.", key: "fecha_doc", width: 80 },
              { label: "Vencimiento", key: "fecha_ven", width: 80 },
              { label: "Total Compra", key: "importe", width: 90, align: "right" },
              { label: "Pagado", key: "pagado", width: 80, align: "right" },
              { label: "Saldo", key: "saldo", width: 80, align: "right" },
              { label: "Estado", key: "estado", width: 70, align: "center" },
            ]}
            data={cuentas}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "fecha_doc" || key === "fecha_ven") return formatDate(row[key] as string);
              if (key === "importe" || key === "pagado" || key === "saldo") return formatCurrency(row[key] as number);
              if (key === "estado") return row.estado === "P" ? "PENDIENTE" : "CANCELADA";
              return String(row[key] ?? "—");
            }}
            totales={{ "TOTAL PENDIENTE": total }}
          />;
          break;
        }

        case "pagos-instructores": {
          const result = await getPagosInstructores({ pageSize: 9999, fechaDesde, fechaHasta });
          const total = result.data.reduce((s, p) => s + p.valor, 0);
          doc = <ReciboInstructorPDF
            {...paramsBase}
            titulo="PAGOS A INSTRUCTORES"
            subtitulo={`Período: ${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`}
            headers={[
              { label: "Fecha", key: "fecha_pag", width: 80 },
              { label: "Instructor", key: "nombre_instructor" },
              { label: "Especialidad", key: "nombre_especialidad", width: 110 },
              { label: "Período Ini.", key: "periodo_ini", width: 80 },
              { label: "Período Fin", key: "periodo_fin", width: 80 },
              { label: "Valor", key: "valor", width: 90, align: "right" },
            ]}
            data={result.data}
            getCell={(row: Record<string, unknown>, key: string) => {
              if (key === "fecha_pag" || key === "periodo_ini" || key === "periodo_fin") return formatDate(row[key] as string);
              if (key === "valor") return formatCurrency(row.valor as number);
              return String(row[key] ?? "—");
            }}
            totales={{ "TOTAL PAGADO": total }}
          />;
          break;
        }

        default:
          error("Reporte no implementado", `El reporte ${reporteSeleccionado.id} no está disponible.`);
          setGenerando(false);
          return;
      }

      setDocElement(doc);
      setEstado("preview");
    } catch (err) {
      error("Error al generar", String(err));
    } finally {
      setGenerando(false);
    }
  }, [reporteSeleccionado, fechaDesde, fechaHasta, cedula, codigoArticulo, filtroEstado, usuario, error]);

  // ---- VISTA LISTA ----
  if (estado === "lista") {
    const categorias = [...new Set(REPORTES.map(r => r.categoria))];
    return (
      <div className="p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reportes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Seleccione el reporte que desea generar en PDF</p>
        </div>

        {categorias.map((cat) => (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{cat}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {REPORTES.filter(r => r.categoria === cat).map((r) => {
                const Icon = r.icono;
                return (
                  <button
                    key={r.id}
                    onClick={() => seleccionarReporte(r)}
                    className="text-left p-4 rounded-xl border bg-white hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 leading-tight">{r.titulo}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-tight">{r.descripcion}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---- VISTA CONFIGURAR FILTROS ----
  if (estado === "configurar" && reporteSeleccionado) {
    const r = reporteSeleccionado;
    const Icon = r.icono;
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setEstado("lista")} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{r.titulo}</h1>
              <p className="text-sm text-slate-500">{r.descripcion}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            {r.filtros.includes("fechaDesde") && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fecha desde" htmlFor="r-fd"><Input id="r-fd" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} /></FormField>
                <FormField label="Fecha hasta" htmlFor="r-fh"><Input id="r-fh" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} /></FormField>
              </div>
            )}
            {r.filtros.includes("cedula") && (
              <FormField label="Cédula del cliente" required htmlFor="r-ced">
                <Input id="r-ced" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Número de cédula..." />
              </FormField>
            )}
            {r.filtros.includes("codigoArticulo") && (
              <FormField label="Código del artículo" required htmlFor="r-art">
                <Input id="r-art" value={codigoArticulo} onChange={(e) => setCodigoArticulo(e.target.value)} placeholder="Código del artículo..." />
              </FormField>
            )}
            {r.filtros.includes("estado") && (
              <FormField label="Estado">
                <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as "A" | "I" | "todos")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Solo activos</SelectItem>
                    <SelectItem value="I">Solo inactivos</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
            {r.filtros.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Este reporte no requiere filtros adicionales.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setEstado("lista")}><ArrowLeft className="w-4 h-4 mr-1.5" />Volver</Button>
          
          {["listado-clientes", "inventario", "cuentas-por-pagar"].includes(r.id) ? (
            <Button onClick={descargarExcel} disabled={generando} className="min-w-[140px] bg-green-600 hover:bg-green-700">
              {generando
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando...</span>
                : <><Download className="w-4 h-4 mr-1.5" />Descargar Excel</>
              }
            </Button>
          ) : (
            <>
              {!["ficha-cliente", "trazabilidad-medidas"].includes(r.id) && (
                <Button onClick={descargarExcel} disabled={generando} variant="outline" className="text-green-700 border-green-600 hover:bg-green-50">
                  <Download className="w-4 h-4 mr-1.5" />Exportar a Excel
                </Button>
              )}
              <Button onClick={generarReporte} disabled={generando} className="min-w-[140px]">
                {generando
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando PDF...</span>
                  : <><FileText className="w-4 h-4 mr-1.5" />Generar PDF</>
                }
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

// ---- VISTA PREVIEW PDF ----
function PdfPreview({ doc, titulo, reporteId, onVolver }: { doc: React.ReactElement; titulo: string; reporteId: string; onVolver: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [instance] = usePDF({ document: doc as any });
  const [descargando, setDescargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const handleDescargar = async () => {
    if (!instance.blob || !instance.url) return;
    try {
      setDescargando(true);
      const filename = `${reporteId}_${today()}.pdf`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      
      if (isTauri) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        const filePath = await save({ defaultPath: filename, filters: [{ name: "PDF", extensions: ["pdf"] }] });
        if (filePath) {
          const arrayBuffer = await instance.blob.arrayBuffer();
          await writeFile(filePath, new Uint8Array(arrayBuffer));
        }
      } else {
        const a = document.createElement("a");
        a.href = instance.url;
        a.download = filename;
        a.click();
      }
    } catch (e) {
      console.error("Error al descargar PDF:", e);
    } finally {
      setDescargando(false);
    }
  };

  const handleImprimir = async () => {
    if (!instance.blob || !instance.url) return;
    try {
      setImprimiendo(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        const { appDataDir, join } = await import("@tauri-apps/api/path");
        const { writeFile, mkdir, exists } = await import("@tauri-apps/plugin-fs");
        const { openPath } = await import("@tauri-apps/plugin-opener");
        
        const appData = await appDataDir();
        const tempDocsPath = await join(appData, "temp_docs");
        
        if (!(await exists(tempDocsPath))) {
          await mkdir(tempDocsPath, { recursive: true });
        }
        
        const filePath = await join(tempDocsPath, `${reporteId}_print_${Date.now()}.pdf`);
        const arrayBuffer = await instance.blob.arrayBuffer();
        await writeFile(filePath, new Uint8Array(arrayBuffer));
        
        await openPath(filePath);
      } else {
        const w = window.open(instance.url, "_blank");
        w?.print();
      }
    } catch (e) {
      console.error("Error al imprimir PDF:", e);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVolver}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />Volver a filtros
          </Button>
          <span className="text-sm font-medium text-slate-700">{titulo}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={instance.loading || !instance.url || descargando}
            onClick={handleDescargar}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {instance.loading || descargando ? "Preparando..." : "Descargar PDF"}
          </Button>
          <Button size="sm" disabled={instance.loading || !instance.url || imprimiendo}
            onClick={handleImprimir}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            {instance.loading || imprimiendo ? "Preparando..." : "Imprimir"}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
          {doc as any}
        </PDFViewer>
      </div>
    </div>
  );
}

  // ---- VISTA PREVIEW (en el componente principal) ----
  if (estado === "preview" && docElement) {
    return (
      <PdfPreview
        doc={docElement}
        titulo={reporteSeleccionado?.titulo ?? "Reporte"}
        reporteId={reporteSeleccionado?.id ?? "reporte"}
        onVolver={() => setEstado("configurar")}
      />
    );
  }

  return <PageLoading text="Cargando..." />;
}
