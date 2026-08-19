import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { getDetFacturaTiendaPorNro } from '@/db/queries/ventas';
import { getParametros } from '@/db/queries/configuracion';
import { useAuthStore } from '@/store/authStore';
import type { FactuTienda } from '@/db/types';
import { generateHtmlTiendaReceipt } from '@/lib/templates/tiendaReceipt';
import { printHtmlReceipt } from '@/lib/printer';

interface Props {
  factura: FactuTienda | null;
  onClose: () => void;
}

export function ImprimirFacturaTienda({ factura, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [params, setParams] = useState<any>(null);
  const { usuario } = useAuthStore();

  useEffect(() => {
    if (!factura) return;
    setLoading(true);
    Promise.all([getDetFacturaTiendaPorNro(factura.nro_docu), getParametros()])
      .then(([detalles, conf]) => {
        setItems(detalles);
        setParams(conf);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [factura]);

  const htmlContent = useMemo(() => {
    if (!factura || !params) return '';
    return generateHtmlTiendaReceipt({
      gimnasio: params.nombre_gimnasio ?? 'SAGIM',
      nit: params.nit,
      direccion: params.direccion,
      telefono: params.telefono,
      textoResolucion: params.texto_resolucion,
      mensajeRecibo: params.mensaje_recibo,
      nroDocu: factura.nro_docu,
      fecha: factura.fecha,
      hora: null, // Si factura tienda no tiene hora
      cliente: factura.nombre_cliente ?? '',
      cedula: factura.cedula ?? '',
      items: items.map((i) => ({
        detalle: i.detalle,
        cantidad: i.cantidad,
        punitario: i.punitario,
        total: i.total,
      })),
      subtotal: factura.subtotal ?? 0,
      iva: factura.iva ?? 0,
      total: factura.total ?? 0,
      generadoPor: usuario?.nombre,
      anulado: factura.estado === 'X',
    });
  }, [factura, params, items, usuario]);

  const handlePrint = () => {
    if (htmlContent) {
      printHtmlReceipt(htmlContent);
    }
  };

  return (
    <Dialog open={!!factura} onOpenChange={(o) => !o && onClose()}>
      <DialogContent hideClose className="max-w-md max-h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex flex-row justify-between items-center pb-2">
          <DialogTitle>Factura N° {String(factura?.nro_docu).padStart(6, '0')}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={!htmlContent} variant="default" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-800 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading || !htmlContent ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            Generando tirilla...
          </div>
        ) : (
          <div className="flex-1 bg-slate-100 rounded-md overflow-y-auto mt-2 p-4 flex justify-center items-start">
            <div
              className="bg-white shadow-sm p-4 w-[80mm] text-black font-mono text-xs overflow-hidden relative border border-slate-200"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
