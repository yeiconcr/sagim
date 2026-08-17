import { formatDate, formatCurrency } from "@/lib/utils";
import { numeroALetras } from "@/lib/numLetras";

interface PosReceiptCajaProps {
  gimnasio: string;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  
  fecha: string;
  referencia: string;
  cedula: string;
  concepto: string;
  natural: string;
  valor: number;
  
  generadoPor?: string;
  valorLetras?: string | null;
  anulado?: boolean;
  textoResolucion?: string | null;
  mensajeRecibo?: string | null;
  nombreCliente?: string | null;
}

export function generateHtmlCajaReceipt(p: PosReceiptCajaProps): string {
  const isIngreso = p.natural === "I";

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
        <div style="font-weight: 800; font-size: 13px; text-transform: uppercase;">COMPROBANTE ${isIngreso ? 'INGRESO' : 'EGRESO'}</div>
        <div style="font-weight: 800; font-size: 14px; padding: 2px 6px; border: 1.5px solid #000; border-radius: 4px;"># ${p.referencia}</div>
      </div>
      <div style="font-size: 10px; color: #444; margin-bottom: 8px;">${formatDate(p.fecha)}</div>
      
      ${p.anulado ? `<div style="text-align: center; font-weight: 900; margin: 8px 0; font-size: 16px; border: 2px solid #000; padding: 4px; border-radius: 4px;">ANULADO</div>` : ''}

      <div style="background: #f4f4f4; border: 1.5px solid #000; border-radius: 6px; padding: 6px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
          <span style="font-weight: 700;">TERCERO:</span>
          <span style="font-weight: 600; text-align: right;">
            ${p.nombreCliente ? `${p.nombreCliente.toUpperCase()}<br/>` : ''}${p.cedula || '—'}
          </span>
        </div>
      </div>
      
      <div style="font-weight: 800; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Concepto</div>
      <div style="font-size: 11px; font-weight: 600; margin-bottom: 12px; padding: 0 4px;">
        ${p.concepto}
      </div>

      <div style="border-bottom: 1.5px dashed #000; margin: 10px 0;"></div>
      
      <div style="background: #000; color: #fff; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 800; font-size: 14px;">VALOR</span>
        <span style="font-weight: 900; font-size: 16px;">${formatCurrency(p.valor)}</span>
      </div>

      <div style="text-align: center; font-size: 9px; font-style: italic; color: #444; margin-bottom: 24px;">
        ${numeroALetras(p.valor)}
      </div>
      
      <div style="text-align: center; margin-top: 16px;">
        <div style="font-size: 9px; color: #555; margin-bottom: 6px;">Recibido por: <span style="font-weight: 600; color: #000;">${p.generadoPor || 'Sistema'}</span></div>
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 8px;">${p.mensajeRecibo || (isIngreso ? '¡Gracias por su pago!' : 'Comprobante generado exitosamente')}</div>
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #888;">SAGIM SOFTWARE</div>
      </div>
    </div>
  `;
}
