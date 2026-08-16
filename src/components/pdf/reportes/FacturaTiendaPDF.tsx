import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS, ReporteHeader, ReporteFooter } from "../PdfBase";
import { formatDate, formatCurrency } from "@/lib/utils";
import { numeroALetras } from "@/lib/numLetras";

interface DetItem { detalle: string; cantidad: number; punitario: number; descuento: number; impuesto: number; total: number; }

interface Props {
  gimnasio: string; nit?: string | null; direccion?: string | null; telefono?: string | null;
  nroDocu: number; fecha: string; hora?: string | null;
  cliente: string; cedula: string; direccionCliente?: string | null; ciudadCliente?: string | null;
  formaPago: string; plazo: number;
  items: DetItem[];
  subtotal: number; iva: number; total: number;
  estado?: string; generadoPor?: string;
}

export function FacturaTiendaPDF(p: Props) {
  const anulada = p.estado === "X";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReporteHeader gimnasio={p.gimnasio} nit={p.nit} direccion={p.direccion} telefono={p.telefono}
          titulo="FACTURA DE VENTA" subtitulo={`No. ${String(p.nroDocu).padStart(6, "0")}`} />

        {anulada && (
          <View style={{ backgroundColor: "#fee2e2", borderRadius: 4, padding: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: COLORS.danger, textAlign: "center" }}>*** ANULADA ***</Text>
          </View>
        )}

        <View style={styles.dataCard}>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Cliente:</Text><Text style={styles.dataValue}>{p.cliente}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Cédula:</Text><Text style={styles.dataValue}>{p.cedula}</Text></View>
              {p.direccionCliente && <View style={styles.dataRow}><Text style={styles.dataLabel}>Dirección:</Text><Text style={styles.dataValue}>{p.direccionCliente}</Text></View>}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Fecha:</Text><Text style={styles.dataValue}>{formatDate(p.fecha)}</Text></View>
              <View style={styles.dataRow}><Text style={styles.dataLabel}>Forma de pago:</Text><Text style={styles.dataValue}>{p.formaPago}{p.plazo > 0 ? ` (${p.plazo} días)` : ""}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Artículo</Text>
            <Text style={[styles.tableHeaderCell, { width: 35, textAlign: "right" }]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "right" }]}>P. Unitario</Text>
            <Text style={[styles.tableHeaderCell, { width: 25, textAlign: "right" }]}>Desc%</Text>
            <Text style={[styles.tableHeaderCell, { width: 25, textAlign: "right" }]}>IVA%</Text>
            <Text style={[styles.tableHeaderCell, { width: 75, textAlign: "right" }]}>Total</Text>
          </View>
          {p.items.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{item.detalle}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 35 }]}>{item.cantidad}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 70 }]}>{formatCurrency(item.punitario)}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 25 }]}>{item.descuento > 0 ? `${item.descuento}%` : "—"}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { width: 25 }]}>{item.impuesto > 0 ? `${item.impuesto}%` : "—"}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, styles.tableCellBold, { width: 75 }]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalesSection}>
          <View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal sin IVA:</Text><Text style={styles.totalValor}>{formatCurrency(p.subtotal)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA:</Text><Text style={styles.totalValor}>{formatCurrency(p.iva)}</Text></View>
            <View style={[styles.totalRow, { borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 3 }]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={[styles.totalValor, styles.totalFinal]}>{formatCurrency(p.total)}</Text>
            </View>
            <Text style={styles.valorLetras}>{numeroALetras(p.total)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 40 }}>
          <View style={{ alignItems: "center" }}><View style={{ width: 120, borderBottomWidth: 0.5, borderBottomColor: COLORS.text }} /><Text style={{ fontSize: 8, color: COLORS.secondary, marginTop: 4 }}>Firma del Cliente</Text></View>
          <View style={{ alignItems: "center" }}><View style={{ width: 120, borderBottomWidth: 0.5, borderBottomColor: COLORS.text }} /><Text style={{ fontSize: 8, color: COLORS.secondary, marginTop: 4 }}>Recibido por</Text></View>
        </View>
        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
