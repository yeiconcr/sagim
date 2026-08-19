import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatDate, formatCurrency } from '@/lib/utils';
import { numeroALetras } from '@/lib/numLetras';

interface DetItem {
  detalle: string;
  cantidad: number;
  punitario: number;
  descuento: number;
  total: number;
  periodicidad: string;
}

interface Props {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  nroDocu: number;
  fecha: string;
  hora?: string | null;
  cliente: string;
  cedula: string;
  inscripcion: number;
  direccionCliente?: string | null;
  ciudadCliente?: string | null;
  items: DetItem[];
  total: number;
  observaciones?: string | null;
  generadoPor?: string;
  estado?: string;
}

export function ReciboGymPDF(p: Props) {
  const subtotal = p.items.reduce((s, i) => s + i.total, 0);
  const anulado = p.estado === 'X';

  // 80mm thermal receipt width is approx 226 points
  const RECEIPT_WIDTH = 226;

  const tirillaStyles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 8,
      color: '#000',
      backgroundColor: '#fff',
      padding: 10,
    },
    centerText: { textAlign: 'center' },
    bold: { fontFamily: 'Helvetica-Bold' },
    title: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 2 },
    subtitle: { fontSize: 8, textAlign: 'center', marginBottom: 1 },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      borderBottomStyle: 'dashed',
      marginVertical: 6,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    rowItem: { flexDirection: 'column', marginBottom: 4 },
    itemDetail: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
    itemSub: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 4 },
    totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    footerText: { fontSize: 7, textAlign: 'center', marginTop: 10 },
  });

  return (
    <Document>
      <Page size={[RECEIPT_WIDTH, 600]} style={tirillaStyles.page}>
        {/* Encabezado */}
        <Text style={tirillaStyles.title}>{p.gimnasio}</Text>
        {p.nit && <Text style={tirillaStyles.subtitle}>NIT: {p.nit}</Text>}
        {p.direccion && <Text style={tirillaStyles.subtitle}>{p.direccion}</Text>}
        {p.telefono && <Text style={tirillaStyles.subtitle}>Tel: {p.telefono}</Text>}

        <View style={tirillaStyles.divider} />

        <Text style={[tirillaStyles.centerText, tirillaStyles.bold, { fontSize: 10 }]}>
          RECIBO DE CAJA
        </Text>
        <Text style={tirillaStyles.centerText}>Nro: {String(p.nroDocu).padStart(6, '0')}</Text>
        <Text style={tirillaStyles.centerText}>
          Fecha: {formatDate(p.fecha)}{' '}
          {p.hora
            ? new Date(p.hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : ''}
        </Text>

        {anulado && (
          <Text
            style={[tirillaStyles.centerText, tirillaStyles.bold, { marginTop: 4, fontSize: 12 }]}
          >
            ( ANULADO )
          </Text>
        )}

        <View style={tirillaStyles.divider} />

        {/* Cliente */}
        <View style={tirillaStyles.row}>
          <Text style={tirillaStyles.bold}>Cliente:</Text>
          <Text>{p.cliente}</Text>
        </View>
        <View style={tirillaStyles.row}>
          <Text style={tirillaStyles.bold}>C.C/NIT:</Text>
          <Text>{p.cedula}</Text>
        </View>

        <View style={tirillaStyles.divider} />

        {/* Detalle */}
        <Text style={[tirillaStyles.bold, { marginBottom: 4 }]}>DESCRIPCIÓN</Text>

        {p.items.map((item, i) => (
          <View key={i} style={tirillaStyles.rowItem}>
            <Text style={tirillaStyles.itemDetail}>{item.detalle}</Text>
            <View style={tirillaStyles.itemSub}>
              <Text>
                {item.cantidad} x {formatCurrency(item.punitario)}
              </Text>
              <Text>{formatCurrency(item.total)}</Text>
            </View>
          </View>
        ))}

        <View style={tirillaStyles.divider} />

        {/* Totales */}
        <View style={tirillaStyles.row}>
          <Text style={tirillaStyles.totalLabel}>TOTAL:</Text>
          <Text style={tirillaStyles.totalValue}>{formatCurrency(p.total)}</Text>
        </View>

        <Text
          style={[tirillaStyles.centerText, { fontSize: 7, marginTop: 4, fontStyle: 'italic' }]}
        >
          {numeroALetras(p.total)}
        </Text>

        <View style={[tirillaStyles.divider, { marginTop: 15 }]} />

        {/* Firma / Pie */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <View style={{ width: 120, borderBottomWidth: 1, borderBottomColor: '#000' }} />
          <Text style={{ marginTop: 2, fontSize: 8 }}>Firma Cliente</Text>
        </View>

        <Text style={tirillaStyles.footerText}>Atendido por: {p.generadoPor}</Text>
        <Text style={[tirillaStyles.footerText, { marginTop: 2 }]}>¡Gracias por preferirnos!</Text>
        <Text style={[tirillaStyles.footerText, { marginTop: 2 }]}>SAGIM Software</Text>
      </Page>
    </Document>
  );
}
