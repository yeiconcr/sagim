/**
 * Componentes base para todos los reportes PDF de SAGIM.
 * Usa @react-pdf/renderer.
 */
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";
import { today } from "@/lib/utils";

// Paleta de colores corporativa
export const COLORS = {
  primary: "#1e40af",
  secondary: "#64748b",
  accent: "#0ea5e9",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  light: "#f1f5f9",
  border: "#e2e8f0",
  text: "#1e293b",
  textLight: "#64748b",
  white: "#ffffff",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  // Header del reporte
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },
  gimnasioNombre: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 2,
  },
  gimnasioInfo: {
    fontSize: 8,
    color: COLORS.secondary,
    marginBottom: 1,
  },
  reporteTitulo: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 3,
  },
  reporteFecha: {
    fontSize: 8,
    color: COLORS.secondary,
  },
  // Filtros
  filtrosBand: {
    backgroundColor: COLORS.light,
    padding: 6,
    borderRadius: 4,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },
  filtroItem: { flexDirection: "row", gap: 3 },
  filtroLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.secondary },
  filtroValor: { fontSize: 8, color: COLORS.text },
  // Tabla
  table: { width: "100%" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.light,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.text,
  },
  tableCellBold: {
    fontFamily: "Helvetica-Bold",
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableCellCenter: {
    textAlign: "center",
  },
  // Totales
  totalesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
    minWidth: 200,
  },
  totalLabel: {
    fontSize: 9,
    color: COLORS.secondary,
    flex: 1,
    textAlign: "right",
  },
  totalValor: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    minWidth: 70,
    textAlign: "right",
  },
  totalFinal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  // Valor en letras
  valorLetras: {
    fontSize: 8,
    color: COLORS.secondary,
    fontStyle: "italic",
    marginTop: 4,
    padding: 5,
    backgroundColor: COLORS.light,
    borderRadius: 3,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.secondary,
  },
  // Badges de estado
  badgeActivo: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  badgeInactivo: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 7,
  },
  badgeAnulado: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  // Card de datos
  dataCard: {
    border: 0.5,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  dataLabel: {
    fontSize: 8,
    color: COLORS.secondary,
    width: 100,
  },
  dataValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    flex: 1,
  },
});

interface HeaderProps {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  titulo: string;
  subtitulo?: string;
  fechaImpresion?: string;
  logoPath?: string | null;
  colorPrimario?: string | null;
}

export function ReporteHeader({ gimnasio, nit, direccion, telefono, titulo, subtitulo, fechaImpresion, logoPath, colorPrimario }: HeaderProps) {
  return (
    <View style={[styles.header, colorPrimario ? { borderBottomColor: colorPrimario } : {}]}>
      <View style={[styles.headerLeft, { flexDirection: 'row', gap: 10, alignItems: 'center' }]}>
        {logoPath && (
          <Image src={logoPath} style={{ width: 50, height: 50, objectFit: "contain" }} />
        )}
        <View>
          <Text style={[styles.gimnasioNombre, colorPrimario ? { color: colorPrimario } : {}]}>{gimnasio}</Text>
          {nit && <Text style={styles.gimnasioInfo}>NIT: {nit}</Text>}
          {direccion && <Text style={styles.gimnasioInfo}>{direccion}</Text>}
          {telefono && <Text style={styles.gimnasioInfo}>Tel: {telefono}</Text>}
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.reporteTitulo}>{titulo}</Text>
        {subtitulo && <Text style={styles.reporteFecha}>{subtitulo}</Text>}
        <Text style={styles.reporteFecha}>
          Impreso: {fechaImpresion ?? new Date().toLocaleString("es-CO")}
        </Text>
      </View>
    </View>
  );
}

interface FooterProps {
  pageNumber?: number;
  totalPages?: number;
  generadoPor?: string;
}

// import package to get version dynamically
import pkg from "../../../package.json";

export function ReporteFooter({ pageNumber, totalPages, generadoPor }: FooterProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        <Text>Generado el {today()} {generadoPor ? `por ${generadoPor}` : ""} · SAGIM v{pkg.version} · Desarrollado por Yeison Constain</Text>
        {pageNumber !== undefined ? `  Página ${pageNumber} de ${totalPages ?? "?"}` : ""}
      </Text>
    </View>
  );
}

interface TableProps<T> {
  headers: Array<{ label: string; key: keyof T | string; width?: number; align?: "left" | "right" | "center" }>;
  data: T[];
  getCell?: (row: T, key: string) => string;
}

export function ReporteTable<T extends Record<string, unknown>>({ headers, data, getCell }: TableProps<T>) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {headers.map((h, i) => (
          <View
            key={i}
            style={[
              h.width ? { width: h.width } : { flex: 1 },
              h.align === "right" ? { alignItems: "flex-end" } : {},
              h.align === "center" ? { alignItems: "center" } : {},
            ]}
          >
            <Text style={styles.tableHeaderCell}>{h.label}</Text>
          </View>
        ))}
      </View>
      {/* Rows */}
      {data.map((row, ri) => (
        <View key={ri} style={[styles.tableRow, ri % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
          {headers.map((h, ci) => {
            const val = getCell
              ? getCell(row, String(h.key))
              : String(row[h.key as keyof T] ?? "—");
            return (
              <View
                key={ci}
                style={[
                  h.width ? { width: h.width } : { flex: 1 },
                  h.align === "right" ? { alignItems: "flex-end" } : {},
                  h.align === "center" ? { alignItems: "center" } : {},
                ]}
              >
                <Text style={styles.tableCell}>{val}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
