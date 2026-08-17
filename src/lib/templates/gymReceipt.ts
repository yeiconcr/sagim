import { formatDate, formatCurrency } from "@/lib/utils";
import { numeroALetras } from "@/lib/numLetras";

interface ReceiptItem {
  detalle: string;
  cantidad: number;
  punitario: number;
  total: number;
}

interface PosReceiptGymProps {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  nroDocu: number;
  fecha: string;
  hora?: string | null;
  cliente: string;
  cedula: string;
  items: ReceiptItem[];
  total: number;
  generadoPor?: string;
  anulado?: boolean;
  textoResolucion?: string | null;
  mensajeRecibo?: string | null;
}

export function generateHtmlGymReceipt(p: PosReceiptGymProps): string {
  const timeStr = p.hora ? new Date(p.hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : "";

  const itemsHtml = p.items.map(item => `
    <tr>
      <td colspan="2" style="font-weight: bold; font-size: 11px;">${item.detalle}</td>
    </tr>
    <tr>
      <td style="font-size: 10px;">${item.cantidad} x ${formatCurrency(item.punitario)}</td>
      <td style="text-align: right; font-size: 10px;">${formatCurrency(item.total)}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family: monospace, sans-serif; font-size: 11px; color: #000; line-height: 1.2;">
      <div style="text-align: center;">
        <div style="font-weight: bold; font-size: 14px;">${p.gimnasio}</div>
        ${p.nit ? `<div style="font-size: 10px;">NIT: ${p.nit}</div>` : ''}
        ${p.direccion ? `<div style="font-size: 10px;">${p.direccion}</div>` : ''}
        ${p.telefono ? `<div style="font-size: 10px;">Tel: ${p.telefono}</div>` : ''}
        ${p.textoResolucion ? `<div style="font-size: 9px; margin-top: 4px; font-style: italic;">${p.textoResolucion}</div>` : ''}
      </div>
      
      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="text-align: center; font-weight: bold; margin-bottom: 4px; font-size: 12px;">RECIBO DE CAJA</div>
      <div style="text-align: center; font-size: 10px;">Nro: ${String(p.nroDocu).padStart(6, "0")}</div>
      <div style="text-align: center; font-size: 10px; margin-bottom: 4px;">Fecha: ${formatDate(p.fecha)} ${timeStr}</div>
      
      ${p.anulado ? `<div style="text-align: center; font-weight: bold; margin-bottom: 4px; font-size: 14px;">( ANULADO )</div>` : ''}

      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
        <span style="font-weight: bold;">Cliente:</span>
        <span>${p.cliente}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px;">
        <span style="font-weight: bold;">C.C/NIT:</span>
        <span>${p.cedula}</span>
      </div>
      
      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px;">DESCRIPCIÓN</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
        ${itemsHtml}
      </table>

      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
        <span>TOTAL:</span>
        <span>${formatCurrency(p.total)}</span>
      </div>

      <div style="text-align: center; font-size: 9px; margin-top: 4px; font-style: italic;">
        ${numeroALetras(p.total)}
      </div>

      <div style="border-bottom: 1px dashed #000; margin: 16px 0;"></div>

      <div style="margin-top: 16px; text-align: center;">
        <div style="width: 120px; border-bottom: 1px solid #000; margin: 0 auto;"></div>
        <div style="font-size: 9px; margin-top: 4px;">Firma Cliente</div>
      </div>
      
      <div style="text-align: center; font-size: 9px; margin-top: 16px;">
        <div style="margin-bottom: 2px;">Atendido por: ${p.generadoPor || 'Sistema'}</div>
        <div style="margin-bottom: 2px;">${p.mensajeRecibo || '¡Gracias por preferirnos!'}</div>
        <div>SAGIM Software</div>
      </div>
    </div>
  `;
}
