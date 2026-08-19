import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, COLORS, ReporteHeader, ReporteFooter } from '../PdfBase';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Medida {
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
interface Pago {
  fecha_pag: string;
  nombre_actividad?: string | null;
  valor: number;
  periodicidad: string;
}
interface Props {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  sexo?: string | null;
  ciudad?: string | null;
  direccionCliente?: string | null;
  telefono1?: string | null;
  celular?: string | null;
  email?: string | null;
  fechaInscripcion?: string | null;
  fechaNacimiento?: string | null;
  estado: string;
  ultimaMedida?: Medida | null;
  ultimosPagos?: Pago[];
  generadoPor?: string;
}

export function FichaClientePDF(p: Props) {
  const sexoLabel = p.sexo === '1' ? 'Masculino' : p.sexo === '2' ? 'Femenino' : '—';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReporteHeader
          gimnasio={p.gimnasio}
          nit={p.nit}
          direccion={p.direccion}
          telefono={p.telefono}
          titulo="FICHA DE INSCRIPCIÓN"
          subtitulo={`Inscripción N° ${p.inscripcion}`}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.dataCard}>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  color: COLORS.primary,
                  marginBottom: 6,
                }}
              >
                DATOS PERSONALES
              </Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Nombre:</Text>
                <Text style={styles.dataValue}>
                  {p.nombres} {p.apellidos}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Cédula:</Text>
                <Text style={styles.dataValue}>{p.cedula}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Sexo:</Text>
                <Text style={styles.dataValue}>{sexoLabel}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Fecha nacimiento:</Text>
                <Text style={styles.dataValue}>
                  {p.fechaNacimiento ? formatDate(p.fechaNacimiento) : '—'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Fecha inscripción:</Text>
                <Text style={styles.dataValue}>
                  {p.fechaInscripcion ? formatDate(p.fechaInscripcion) : '—'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Estado:</Text>
                <Text
                  style={[
                    styles.dataValue,
                    { color: p.estado === 'A' ? COLORS.success : COLORS.danger },
                  ]}
                >
                  {p.estado === 'A' ? 'ACTIVO' : 'INACTIVO'}
                </Text>
              </View>
            </View>
            <View style={styles.dataCard}>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  color: COLORS.primary,
                  marginBottom: 6,
                }}
              >
                CONTACTO
              </Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Dirección:</Text>
                <Text style={styles.dataValue}>{p.direccionCliente || '—'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Ciudad:</Text>
                <Text style={styles.dataValue}>{p.ciudad || '—'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Teléfono:</Text>
                <Text style={styles.dataValue}>{p.telefono1 || '—'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Celular:</Text>
                <Text style={styles.dataValue}>{p.celular || '—'}</Text>
              </View>
              {p.email && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Email:</Text>
                  <Text style={styles.dataValue}>{p.email}</Text>
                </View>
              )}
            </View>
          </View>
          <View
            style={{
              width: 110,
              height: 140,
              border: 0.5,
              borderColor: COLORS.border,
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 8, color: COLORS.secondary }}>FOTO</Text>
          </View>
        </View>

        {p.ultimaMedida && (
          <View style={styles.dataCard}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'Helvetica-Bold',
                color: COLORS.primary,
                marginBottom: 6,
              }}
            >
              MEDIDAS CORPORALES ({formatDate(p.ultimaMedida.fecha)})
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['Peso', p.ultimaMedida.peso, 'kg'],
                ['Talla', p.ultimaMedida.talla, 'cm'],
                ['Cintura', p.ultimaMedida.cintura, 'cm'],
                ['Brazos', p.ultimaMedida.brazos, 'cm'],
                ['Muslos', p.ultimaMedida.muslos, 'cm'],
                ['Torax', p.ultimaMedida.torax, 'cm'],
                ['Cadera', p.ultimaMedida.cadera, 'cm'],
                ['Estatura', p.ultimaMedida.estatura, 'cm'],
              ].map(([label, val, unit]) => (
                <View
                  key={String(label)}
                  style={{
                    width: 80,
                    backgroundColor: COLORS.light,
                    borderRadius: 4,
                    padding: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 7, color: COLORS.secondary }}>{String(label)}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.text }}>
                    {val ?? '—'}
                  </Text>
                  <Text style={{ fontSize: 7, color: COLORS.secondary }}>{String(unit)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {p.ultimosPagos && p.ultimosPagos.length > 0 && (
          <View style={styles.dataCard}>
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'Helvetica-Bold',
                color: COLORS.primary,
                marginBottom: 6,
              }}
            >
              ÚLTIMOS PAGOS
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Fecha</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actividad</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Valor</Text>
              </View>
              {p.ultimosPagos.slice(0, 5).map((pg, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{formatDate(pg.fecha_pag)}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{pg.nombre_actividad || '—'}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>
                    {formatCurrency(pg.valor)}
                  </Text>
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
