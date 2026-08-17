import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, RotateCcw, Check, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

type CameraState = "loading" | "requesting" | "active" | "error";

export function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("loading");

  // Iniciar cámara
  useEffect(() => {
    let mounted = true;
    
    async function startCamera() {
      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (mounted) {
          setError("Su navegador no soporta acceso a la cámara.");
          setCameraState("error");
        }
        return;
      }

      setCameraState("requesting");

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setCameraState("active");
        } else if (mediaStream) {
          // Si el componente se desmontó, detener el stream
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err: unknown) {
        console.error("Error accediendo a la cámara:", err);
        if (mounted) {
          const error = err as Error & { name?: string };
          // Mensajes específicos según el tipo de error
          if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            setError("Permiso de cámara denegado. Por favor permita el acceso a la cámara cuando el sistema lo solicite.");
          } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            setError("No se encontró ninguna cámara conectada al equipo.");
          } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
            setError("La cámara está siendo usada por otra aplicación. Ciérrela e intente de nuevo.");
          } else if (error.name === "OverconstrainedError") {
            setError("La cámara no cumple con los requisitos mínimos.");
          } else {
            setError(`Error al acceder a la cámara: ${error.message || "Error desconocido"}`);
          }
          setCameraState("error");
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
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
            {cameraState === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white/70 text-sm">Iniciando...</p>
              </div>
            )}

            {cameraState === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                <Camera className="w-12 h-12 text-white/70" />
                <p className="text-white text-center text-sm">
                  Solicitando acceso a la cámara...
                </p>
                <p className="text-white/50 text-center text-xs">
                  Por favor permita el acceso cuando el sistema lo solicite
                </p>
              </div>
            )}
            
            {cameraState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                <VideoOff className="w-12 h-12 text-red-400" />
                <p className="text-white text-center text-sm">{error}</p>
              </div>
            )}

            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cameraState === "active" ? "w-full h-full object-cover" : "hidden"}
              />
            ) : (
              <img src={capturedImage} alt="Captura" className="w-full h-full object-cover" />
            )}

            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Botones */}
          <div className="p-3 flex gap-2">
            {cameraState === "error" ? (
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cerrar
              </Button>
            ) : !capturedImage ? (
              <Button 
                onClick={handleCapture} 
                disabled={cameraState !== "active"}
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
