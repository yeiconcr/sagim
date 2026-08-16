import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, COLORS, ReporteHeader, ReporteFooter, ReporteTable } from "../PdfBase";
import { formatCurrency } from "@/lib/utils";

interface ArtRow { codigo: string; nombre: string; stock: number; unidad_medida: string; precio_compra: number; ganancia: number; estado: string; nombre_proveedor?: string | null; }
interface Props { gimnasio: string; nit?: string | null; direccion?: string | null; telefono?: string | null; articulos: ArtRow[]; generadoPor?: string; }

export function InventarioPDF(p: Props) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingHorizontal: 20 }]} orientation="landscape">
        <ReporteHeader gimnasio={p.gimnasio} nit={p.nit} direccion={p.direccion} telefono={p.telefono}
          titulo="INVENTARIO DE PRODUCTOS" subtitulo={`Total artículos: ${p.articulos.length}`} />
        <ReporteTable
          headers={[
            { label: "Código", key: "codigo", width: 60 },
            { label: "Artículo", key: "nombre" },
            { label: "Stock", key: "stock", width: 50, align: "right" },
            { label: "Unidad", key: "unidad_medida", width: 50, align: "center" },
            { label: "P. Compra", key: "precio_compra", width: 80, align: "right" },
            { label: "% Gan.", key: "ganancia", width: 50, align: "right" },
            { label: "P. Venta", key: "precio_venta", width: 80, align: "right" },
            { label: "Proveedor", key: "nombre_proveedor", width: 100 },
            { label: "Estado", key: "estado", width: 55, align: "center" },
          ]}
          data={p.articulos as unknown as Record<string, unknown>[]}
          getCell={(row, key) => {
            if (key === "precio_compra") return formatCurrency(row.precio_compra as number);
            if (key === "precio_venta") return formatCurrency((row.precio_compra as number) * (1 + (row.ganancia as number) / 100));
            if (key === "ganancia") return `${row.ganancia}%`;
            if (key === "estado") return row.estado === "A" ? "ACTIVO" : "INACTIVO";
            if (key === "nombre_proveedor") return String(row.nombre_proveedor ?? "—");
            return String(row[key] ?? "—");
          }}
        />
        <ReporteFooter generadoPor={p.generadoPor} />
      </Page>
    </Document>
  );
}
