import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, COLORS, ReporteHeader, ReporteFooter, ReporteTable } from '../PdfBase';
import { formatDate } from '@/lib/utils';

interface ClienteRow {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  celular?: string | null;
  ciudad?: string | null;
  fecha_inscripcion?: string | null;
  estado: string;
}

interface Props {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  clientes: ClienteRow[];
  filtro?: string;
  generadoPor?: string;
}

export function ListadoClientesPDF(p: Props) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingHorizontal: 20 }]} orientation="landscape">
        <ReporteHeader
          gimnasio={p.gimnasio}
          nit={p.nit}
          direccion={p.direccion}
          telefono={p.telefono}
          titulo="LISTADO DE CLIENTES"
          subtitulo={`Estado: ${p.filtro || 'Todos'} · Total: ${p.clientes.length}`}
        />
        <ReporteTable
          headers={[
            { label: 'Insc.', key: 'inscripcion', width: 45, align: 'center' },
            { label: 'Cédula', key: 'cedula', width: 80 },
            { label: 'Nombres', key: 'nombres', width: 90 },
            { label: 'Apellidos', key: 'apellidos', width: 90 },
            { label: 'Celular', key: 'celular', width: 80 },
            { label: 'Ciudad', key: 'ciudad', width: 70 },
            { label: 'Inscripción', key: 'fecha_inscripcion', width: 75 },
            { label: 'Estado', key: 'estado', width: 55, align: 'center' },
          ]}
          data={p.clientes as unknown as Record<string, unknown>[]}
          getCell={(row, key) => {
            if (key === 'fecha_inscripcion') return formatDate(row.fecha_inscripcion as string);
            if (key === 'estado') return row.estado === 'A' ? 'ACTIVO' : 'INACTIVO';
            return String(row[key] ?? '—');
          }}
        />
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: COLORS.secondary }}>
            Total registros:{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.clientes.length}</Text>
          </Text>
        </View>
        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
