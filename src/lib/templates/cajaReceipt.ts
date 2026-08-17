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
}

export function generateHtmlCajaReceipt(p: PosReceiptCajaProps): string {
  const isIngreso = p.natural === "I";

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
      
      <div style="text-align: center; font-weight: bold; margin-bottom: 4px; font-size: 12px;">
        COMPROBANTE DE ${isIngreso ? "INGRESO" : "EGRESO"}
      </div>
      <div style="text-align: center; font-size: 10px;">Ref: ${p.referencia || "MANUAL"}</div>
      <div style="text-align: center; font-size: 10px; margin-bottom: 4px;">Fecha: ${formatDate(p.fecha)}</div>
      
      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 10px;">
        <span style="font-weight: bold;">${isIngreso ? "Recibido de:" : "Pagado a:"}</span>
        <span>${p.cedula || "Varios"}</span>
      </div>
      
      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px;">CONCEPTO</div>
      <div style="font-size: 10px; margin-bottom: 4px;">${p.concepto}</div>

      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
        <span>VALOR:</span>
        <span>${formatCurrency(p.valor)}</span>
      </div>

      <div style="text-align: center; font-size: 9px; margin-top: 4px; font-style: italic;">
        ${numeroALetras(p.valor)}
      </div>

      <div style="border-bottom: 1px dashed #000; margin: 16px 0;"></div>

      <div style="margin-top: 16px; text-align: center;">
        <div style="width: 120px; border-bottom: 1px solid #000; margin: 0 auto;"></div>
        <div style="font-size: 9px; margin-top: 4px;">Firma</div>
      </div>
      
      <div style="text-align: center; font-size: 9px; margin-top: 16px;">
        <div style="margin-bottom: 2px;">Recibido por: ${p.generadoPor || 'Sistema'}</div>
        <div style="margin-bottom: 2px;">${p.mensajeRecibo || '¡Gracias por su abono!'}</div>
        <div>SAGIM Software</div>
      </div>
    </div>
  `;
}
