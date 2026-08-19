import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, COLORS, ReporteHeader, ReporteFooter, ReporteTable } from '../PdfBase';
import { formatDate } from '@/lib/utils';

interface MedRow {
  fecha: string;
  peso?: number | null;
  talla?: number | null;
  cintura?: number | null;
  brazos?: number | null;
  muslos?: number | null;
  torax?: number | null;
  cadera?: number | null;
  estatura?: number | null;
}
interface Props {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  cliente: string;
  cedula: string;
  inscripcion: number;
  medidas: MedRow[];
  generadoPor?: string;
}

export function TrazabilidadMedidasPDF(p: Props) {
  const fmt = (v: number | null | undefined) => (v != null && v > 0 ? String(v) : '—');
  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingHorizontal: 20 }]} orientation="landscape">
        <ReporteHeader
          gimnasio={p.gimnasio}
          nit={p.nit}
          direccion={p.direccion}
          telefono={p.telefono}
          titulo="TRAZABILIDAD DE MEDIDAS"
          subtitulo={`${p.cliente} · Cédula: ${p.cedula} · Insc. #${p.inscripcion}`}
        />
        <ReporteTable
          headers={[
            { label: 'Fecha', key: 'fecha', width: 70 },
            { label: 'Peso (kg)', key: 'peso', width: 65, align: 'right' },
            { label: 'Talla (cm)', key: 'talla', width: 65, align: 'right' },
            { label: 'Cintura', key: 'cintura', width: 55, align: 'right' },
            { label: 'Brazos', key: 'brazos', width: 55, align: 'right' },
            { label: 'Muslos', key: 'muslos', width: 55, align: 'right' },
            { label: 'Torax', key: 'torax', width: 55, align: 'right' },
            { label: 'Cadera', key: 'cadera', width: 55, align: 'right' },
            { label: 'Estatura', key: 'estatura', width: 60, align: 'right' },
          ]}
          data={p.medidas as unknown as Record<string, unknown>[]}
          getCell={(row, key) => {
            if (key === 'fecha') return formatDate(row.fecha as string);
            return fmt(row[key] as number | null | undefined);
          }}
        />
        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
