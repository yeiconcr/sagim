import { formatDate, formatCurrency } from '@/lib/utils';
import { numeroALetras } from '@/lib/numLetras';

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
  const timeStr = p.hora
    ? new Date(p.hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '';

  const itemsHtml = p.items
    .map(
      (item) => `
    <tr>
      <td colspan="2" style="font-weight: bold; font-size: 11px;">${item.detalle}</td>
    </tr>
    <tr>
      <td style="font-size: 10px;">${item.cantidad} x ${formatCurrency(item.punitario)}</td>
      <td style="text-align: right; font-size: 10px;">${formatCurrency(item.total)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #000; line-height: 1.4; letter-spacing: -0.2px;">
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 900; font-size: 18px; text-transform: uppercase; letter-spacing: -0.5px;">${p.gimnasio}</div>
        ${p.nit ? `<div style="font-size: 10px; color: #333; margin-top: 2px;">NIT: ${p.nit}</div>` : ''}
        ${p.direccion ? `<div style="font-size: 10px; color: #333;">${p.direccion}</div>` : ''}
        ${p.telefono ? `<div style="font-size: 10px; color: #333;">Tel: ${p.telefono}</div>` : ''}
        ${p.textoResolucion ? `<div style="font-size: 9px; margin-top: 6px; font-style: italic; color: #555;">${p.textoResolucion}</div>` : ''}
      </div>
      
      <div style="border-bottom: 1.5px dashed #000; margin: 10px 0;"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <div style="font-weight: 800; font-size: 13px; text-transform: uppercase;">RECIBO DE CAJA</div>
        <div style="font-weight: 800; font-size: 14px; padding: 2px 6px; border: 1.5px solid #000; border-radius: 4px;"># ${String(p.nroDocu).padStart(6, '0')}</div>
      </div>
      <div style="font-size: 10px; color: #444; margin-bottom: 8px;">${formatDate(p.fecha)} ${timeStr}</div>
      
      ${p.anulado ? `<div style="text-align: center; font-weight: 900; margin: 8px 0; font-size: 16px; border: 2px solid #000; padding: 4px; border-radius: 4px;">ANULADO</div>` : ''}

      <div style="background: #f4f4f4; border: 1.5px solid #000; border-radius: 6px; padding: 6px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
          <span style="font-weight: 700;">CLIENTE:</span>
          <span style="font-weight: 600; text-align: right;">${p.cliente}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <span style="font-weight: 700;">C.C/NIT:</span>
          <span>${p.cedula}</span>
        </div>
      </div>
      
      <div style="font-weight: 800; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Detalle de la compra</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        ${p.items
          .map(
            (item) => `
          <tr>
            <td colspan="2" style="font-weight: 700; font-size: 11px; padding-bottom: 2px;">${item.detalle}</td>
          </tr>
          <tr>
            <td style="font-size: 10px; color: #444; padding-bottom: 6px;">${item.cantidad} x ${formatCurrency(item.punitario)}</td>
            <td style="text-align: right; font-size: 11px; font-weight: 600; padding-bottom: 6px;">${formatCurrency(item.total)}</td>
          </tr>
        `
          )
          .join('')}
      </table>

      <div style="border-bottom: 1.5px dashed #000; margin: 10px 0;"></div>
      
      <div style="background: #000; color: #fff; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 800; font-size: 14px;">TOTAL</span>
        <span style="font-weight: 900; font-size: 16px;">${formatCurrency(p.total)}</span>
      </div>

      <div style="text-align: center; font-size: 9px; font-style: italic; color: #444; margin-bottom: 24px;">
        ${numeroALetras(p.total)}
      </div>
      
      <div style="text-align: center; margin-top: 16px;">
        <div style="font-size: 9px; color: #555; margin-bottom: 6px;">Atendido por: <span style="font-weight: 600; color: #000;">${p.generadoPor || 'Sistema'}</span></div>
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 8px;">${p.mensajeRecibo || '¡Gracias por preferirnos!'}</div>
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #888;">SAGIM SOFTWARE</div>
      </div>
    </div>
  `;
}
