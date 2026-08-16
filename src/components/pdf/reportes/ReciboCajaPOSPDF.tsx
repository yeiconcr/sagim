import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate, formatCurrency } from "@/lib/utils";
import { numeroALetras } from "@/lib/numLetras";

interface Props {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  
  fecha: string;
  referencia: string; // nroDocu or reference
  cedula: string;     // Cliente/Prov
  concepto: string;
  natural: string;    // "I" or "E"
  valor: number;
  
  generadoPor?: string;
}

export function ReciboCajaPOSPDF(p: Props) {
  // 80mm thermal receipt width is approx 226 points
  const RECEIPT_WIDTH = 226;
  const isIngreso = p.natural === "I";

  const tirillaStyles = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 8,
      color: "#000",
      backgroundColor: "#fff",
      padding: 10,
    },
    centerText: { textAlign: "center" },
    bold: { fontFamily: "Helvetica-Bold" },
    title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
    subtitle: { fontSize: 8, textAlign: "center", marginBottom: 1 },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: "#000",
      borderBottomStyle: "dashed",
      marginVertical: 6,
    },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    footerText: { fontSize: 7, textAlign: "center", marginTop: 10 },
  });

  return (
    <Document>
      <Page size={[RECEIPT_WIDTH, 500]} style={tirillaStyles.page}>
        {/* Encabezado */}
        <Text style={tirillaStyles.title}>{p.gimnasio}</Text>
        {p.nit && <Text style={tirillaStyles.subtitle}>NIT: {p.nit}</Text>}
        {p.direccion && <Text style={tirillaStyles.subtitle}>{p.direccion}</Text>}
        {p.telefono && <Text style={tirillaStyles.subtitle}>Tel: {p.telefono}</Text>}
        
        <View style={tirillaStyles.divider} />
        
        <Text style={[tirillaStyles.centerText, tirillaStyles.bold, { fontSize: 10 }]}>
          COMPROBANTE DE {isIngreso ? "INGRESO" : "EGRESO"}
        </Text>
        <Text style={tirillaStyles.centerText}>Ref: {p.referencia || "MANUAL"}</Text>
        <Text style={tirillaStyles.centerText}>Fecha: {formatDate(p.fecha)}</Text>
        
        <View style={tirillaStyles.divider} />
        
        <View style={tirillaStyles.row}>
          <Text style={tirillaStyles.bold}>{isIngreso ? "Recibido de:" : "Pagado a:"}</Text>
          <Text>{p.cedula || "Varios"}</Text>
        </View>
        
        <View style={tirillaStyles.divider} />

        {/* Detalle */}
        <Text style={[tirillaStyles.bold, { marginBottom: 4 }]}>CONCEPTO</Text>
        <Text style={{ marginBottom: 6 }}>{p.concepto}</Text>

        <View style={tirillaStyles.divider} />

        {/* Totales */}
        <View style={tirillaStyles.row}>
          <Text style={tirillaStyles.totalLabel}>VALOR:</Text>
          <Text style={tirillaStyles.totalValue}>{formatCurrency(p.valor)}</Text>
        </View>

        <Text style={[tirillaStyles.centerText, { fontSize: 7, marginTop: 4, fontStyle: "italic" }]}>
          {numeroALetras(p.valor)}
        </Text>

        <View style={[tirillaStyles.divider, { marginTop: 15 }]} />

        {/* Firma / Pie */}
        <View style={{ marginTop: 20, alignItems: "center" }}>
          <View style={{ width: 120, borderBottomWidth: 1, borderBottomColor: "#000" }} />
          <Text style={{ marginTop: 2, fontSize: 8 }}>Firma</Text>
        </View>
        
        <Text style={tirillaStyles.footerText}>Atendido por: {p.generadoPor}</Text>
        <Text style={[tirillaStyles.footerText, { marginTop: 2 }]}>SAGIM Software</Text>

      </Page>
    </Document>
  );
}
