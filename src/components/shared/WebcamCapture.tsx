import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Iniciar cámara
  useEffect(() => {
    let mounted = true;
    
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error accediendo a la cámara:", err);
        if (mounted) {
          setError("No se pudo acceder a la cámara. Verifique los permisos.");
          setLoading(false);
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Detener cámara al desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar canvas con dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame actual
    ctx.drawImage(video, 0, 0);

    // Obtener imagen como base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      // Detener stream antes de enviar
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onCapture(capturedImage);
    }
  }, [capturedImage, stream, onCapture]);

  const handleClose = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  }, [stream, onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <Card className="w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Capturar Foto
            </h3>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Vista de cámara / imagen capturada */}
          <div className="relative aspect-[4/3] bg-black">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-white text-center text-sm">{error}</p>
              </div>
            )}

            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={capturedImage} alt="Captura" className="w-full h-full object-cover" />
            )}

            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Botones */}
          <div className="p-3 flex gap-2">
            {!capturedImage ? (
              <Button 
                onClick={handleCapture} 
                disabled={loading || !!error}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capturar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Repetir
                </Button>
                <Button onClick={handleConfirm} className="flex-1 bg-primary hover:bg-primary/90">
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
