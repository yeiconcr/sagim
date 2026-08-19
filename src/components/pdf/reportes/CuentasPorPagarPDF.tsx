import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, COLORS, ReporteHeader, ReporteFooter, ReporteTable } from '../PdfBase';
import { formatDate, formatCurrency } from '@/lib/utils';

// Reporte: CuentasPorPagarPDF
// Placeholder funcional — los datos se inyectan desde el módulo Reportes
export function CuentasPorPagarPDF(p: any) {
  const rows = p.data ?? [];
  const headers = p.headers ?? [];
  return (
    <Document>
      <Page
        size="A4"
        style={[styles.page, { paddingHorizontal: 20 }]}
        orientation={p.orientation ?? 'portrait'}
      >
        <ReporteHeader
          gimnasio={p.gimnasio ?? 'SAGIM'}
          nit={p.nit}
          direccion={p.direccion}
          telefono={p.telefono}
          titulo={p.titulo ?? 'CuentasPorPagarPDF'}
          subtitulo={p.subtitulo}
        />
        {headers.length > 0 && <ReporteTable headers={headers} data={rows} getCell={p.getCell} />}
        {p.totales && (
          <View style={styles.totalesSection}>
            <View>
              {Object.entries(p.totales as Record<string, number>).map(([label, val]) => (
                <View key={label} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{label}:</Text>
                  <Text style={styles.totalValor}>{formatCurrency(val)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
