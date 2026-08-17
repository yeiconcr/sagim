import { writeFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";

/**
 * Guarda una foto de cliente desde base64
 * @param base64Data - Imagen en formato base64 (data:image/jpeg;base64,...)
 * @param inscripcion - Número de inscripción del cliente
 * @returns Nombre del archivo guardado
 */
export async function guardarFotoCliente(base64Data: string, inscripcion: number): Promise<string> {
  try {
    // Obtener directorio de la app
    const dataDir = await appDataDir();
    const fotosDir = `${dataDir}/fotos`;

    // Crear directorio si no existe
    const dirExists = await exists(fotosDir);
    if (!dirExists) {
      await mkdir(fotosDir, { recursive: true });
    }

    // Extraer datos base64 (remover prefijo data:image/jpeg;base64,)
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
    
    // Convertir base64 a Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generar nombre de archivo único
    const timestamp = Date.now();
    const fileName = `cliente_${inscripcion}_${timestamp}.jpg`;
    const filePath = `${fotosDir}/${fileName}`;

    // Guardar archivo
    await writeFile(filePath, bytes);

    console.log(`[Photos] Foto guardada: ${filePath}`);
    return fileName;
  } catch (error) {
    console.error("[Photos] Error guardando foto:", error);
    throw error;
  }
}

/**
 * Obtiene la ruta completa de una foto de cliente
 * @param fileName - Nombre del archivo de foto
 * @returns Ruta completa o null si no existe
 */
export async function obtenerRutaFoto(fileName: string | null): Promise<string | null> {
  if (!fileName) return null;
  
  try {
    const dataDir = await appDataDir();
    const filePath = `${dataDir}/fotos/${fileName}`;
    const fileExists = await exists(filePath);
    
    if (fileExists) {
      // En Tauri, usar asset: protocol para cargar archivos locales
      return `asset://localhost/${filePath}`;
    }
    return null;
  } catch {
    return null;
  }
}
