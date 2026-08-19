import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, COLORS, ReporteHeader, ReporteFooter, ReporteTable } from '../PdfBase';
import { formatDate, formatCurrency } from '@/lib/utils';

interface KRow {
  fecha: string;
  detalle?: string | null;
  cantidad_in: number;
  punitario_in: number;
  total_in: number;
  cantidad_sa: number;
  punitario_sa: number;
  total_sa: number;
  saldo?: number;
}
interface Props {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  articulo: string;
  codigo: string;
  stockActual: number;
  kardex: KRow[];
  fechaDesde?: string;
  fechaHasta?: string;
  generadoPor?: string;
}

export function KardexPDF(p: Props) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingHorizontal: 20 }]} orientation="landscape">
        <ReporteHeader
          gimnasio={p.gimnasio}
          nit={p.nit}
          direccion={p.direccion}
          telefono={p.telefono}
          titulo={`KÁRDEX: ${p.articulo}`}
          subtitulo={`Código: ${p.codigo} · Stock actual: ${p.stockActual} · Período: ${p.fechaDesde || 'Inicio'} — ${p.fechaHasta || 'Hoy'}`}
        />
        <ReporteTable
          headers={[
            { label: 'Fecha', key: 'fecha', width: 70 },
            { label: 'Detalle', key: 'detalle' },
            { label: 'Cant. Entrada', key: 'cantidad_in', width: 75, align: 'right' },
            { label: 'Val. Entrada', key: 'total_in', width: 85, align: 'right' },
            { label: 'Cant. Salida', key: 'cantidad_sa', width: 75, align: 'right' },
            { label: 'Val. Salida', key: 'total_sa', width: 85, align: 'right' },
            { label: 'Saldo', key: 'saldo', width: 60, align: 'right' },
          ]}
          data={p.kardex as unknown as Record<string, unknown>[]}
          getCell={(row, key) => {
            if (key === 'fecha') return formatDate(row.fecha as string);
            if (key === 'detalle') return String(row.detalle ?? '—');
            if (key === 'total_in') {
              const v = row.total_in as number;
              return v > 0 ? formatCurrency(v) : '—';
            }
            if (key === 'total_sa') {
              const v = row.total_sa as number;
              return v > 0 ? formatCurrency(v) : '—';
            }
            if (key === 'cantidad_in') {
              const v = row.cantidad_in as number;
              return v > 0 ? `+${v}` : '—';
            }
            if (key === 'cantidad_sa') {
              const v = row.cantidad_sa as number;
              return v > 0 ? `-${v}` : '—';
            }
            if (key === 'saldo') return String(row.saldo ?? '—');
            return String(row[key] ?? '—');
          }}
        />
        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
