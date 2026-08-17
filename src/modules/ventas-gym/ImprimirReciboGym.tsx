import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { getDetReciboPorNro } from "@/db/queries/ventas";
import { getParametros } from "@/db/queries/configuracion";
import { useAuthStore } from "@/store/authStore";
import type { Recibo } from "@/db/types";
import { generateHtmlGymReceipt } from "@/lib/templates/gymReceipt";
import { printHtmlReceipt } from "@/lib/printer";

interface Props {
  recibo: Recibo | null;
  onClose: () => void;
}

export function ImprimirReciboGym({ recibo, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [params, setParams] = useState<any>(null);
  const { usuario } = useAuthStore();

  useEffect(() => {
    if (!recibo) return;
    setLoading(true);
    Promise.all([
      getDetReciboPorNro(recibo.nro_docu),
      getParametros()
    ])
      .then(([detalles, conf]) => {
        setItems(detalles);
        setParams(conf);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [recibo]);

  const htmlContent = useMemo(() => {
    if (!recibo || !params) return "";
    return generateHtmlGymReceipt({
      gimnasio: params.nombre_gimnasio ?? "SAGIM",
      nit: params.nit,
      direccion: params.direccion,
      telefono: params.telefono,
      textoResolucion: params.texto_resolucion,
      mensajeRecibo: params.mensaje_recibo,
      nroDocu: recibo.nro_docu,
      fecha: recibo.fecha,
      hora: recibo.hora,
      cliente: recibo.nombre_cliente ?? "",
      cedula: recibo.cedula ?? "",
      items: items.map(i => ({
        detalle: i.detalle,
        cantidad: i.cantidad,
        punitario: i.punitario,
        total: i.total
      })),
      total: recibo.total ?? 0,
      generadoPor: usuario?.nombre,
      anulado: recibo.estado === "X"
    });
  }, [recibo, params, items, usuario]);

  const handlePrint = () => {
    if (htmlContent) {
      printHtmlReceipt(htmlContent);
    }
  };

  return (
    <Dialog open={!!recibo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>Recibo N° {String(recibo?.nro_docu).padStart(6, "0")}</DialogTitle>
          <Button onClick={handlePrint} disabled={!htmlContent} variant="default" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Ticket POS
          </Button>
        </DialogHeader>
        
        {loading || !htmlContent ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Generando tirilla...</div>
        ) : (
          <div className="flex-1 bg-slate-100 rounded-md overflow-y-auto mt-2 p-4 flex justify-center">
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
