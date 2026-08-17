import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { getParametros } from "@/db/queries/configuracion";
import { useAuthStore } from "@/store/authStore";
import type { MovCaja } from "@/db/types";
import { generateHtmlCajaReceipt } from "@/lib/templates/cajaReceipt";
import { printHtmlReceipt } from "@/lib/printer";

interface Props {
  movimiento: MovCaja | null;
  onClose: () => void;
}

export function ImprimirReciboCaja({ movimiento, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<any>(null);
  const { usuario } = useAuthStore();

  useEffect(() => {
    if (!movimiento) return;
    setLoading(true);
    getParametros()
      .then((conf) => setParams(conf))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [movimiento]);

  const htmlContent = useMemo(() => {
    if (!movimiento || !params) return "";
    return generateHtmlCajaReceipt({
      gimnasio: params.nombre_gimnasio ?? "SAGIM",
      nit: params.nit,
      direccion: params.direccion,
      telefono: params.telefono,
      textoResolucion: params.texto_resolucion,
      mensajeRecibo: params.mensaje_recibo,
      fecha: movimiento.fecha,
      referencia: movimiento.referencia || "MANUAL",
      cedula: movimiento.cedula || "",
      concepto: movimiento.concepto || "",
      natural: movimiento.natural,
      valor: movimiento.valor,
      generadoPor: usuario?.nombre
    });
  }, [movimiento, params, usuario]);

  const handlePrint = () => {
    if (htmlContent) {
      printHtmlReceipt(htmlContent);
    }
  };

  return (
    <Dialog open={!!movimiento} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>Comprobante</DialogTitle>
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
