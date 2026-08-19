import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, ReporteHeader, ReporteFooter, ReporteTable } from '../PdfBase';

interface AsistenciasPDFProps {
  gimnasio?: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  titulo?: string;
  subtitulo?: string;
  generadoPor?: string;
  headers: Array<{
    label: string;
    key: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  }>;
  data: Array<Record<string, unknown>>;
  getCell: (row: Record<string, unknown>, key: string) => string;
  estadisticas?: {
    totalEntradas: number;
    clientesUnicos: number;
    horaPico: string | null;
    promedioDiario: number;
  };
  logoPath?: string | null;
  colorPrimario?: string | null;
}

export function AsistenciasPDF(p: AsistenciasPDFProps) {
  const rows = p.data ?? [];
  const headers = p.headers ?? [];

  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingHorizontal: 20 }]} orientation="portrait">
        <ReporteHeader
          gimnasio={p.gimnasio ?? 'SAGIM'}
          nit={p.nit}
          direccion={p.direccion}
          telefono={p.telefono}
          titulo={p.titulo ?? 'Control de Asistencias'}
          subtitulo={p.subtitulo}
        />

        {/* Estadísticas */}
        {p.estadisticas && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginBottom: 15,
              padding: 10,
              backgroundColor: '#f8fafc',
              borderRadius: 4,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e40af' }}>
                {p.estadisticas.totalEntradas}
              </Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>Total Entradas</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#059669' }}>
                {p.estadisticas.clientesUnicos}
              </Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>Clientes Únicos</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#7c3aed' }}>
                {p.estadisticas.promedioDiario}
              </Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>Promedio Diario</Text>
            </View>
            {p.estadisticas.horaPico && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ea580c' }}>
                  {p.estadisticas.horaPico}
                </Text>
                <Text style={{ fontSize: 8, color: '#64748b' }}>Hora Pico</Text>
              </View>
            )}
          </View>
        )}

        {headers.length > 0 && <ReporteTable headers={headers} data={rows} getCell={p.getCell} />}

        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
