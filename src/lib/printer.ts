import { writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { join, appDataDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";

export async function printHtmlReceipt(htmlContent: string) {
  try {
    // 1. Obtener el directorio de datos de la app (permitido en scope)
    const appData = await appDataDir();
    const tempDocsPath = await join(appData, "temp_docs");
    
    // Crear el directorio si no existe
    if (!(await exists(tempDocsPath))) {
      await mkdir(tempDocsPath, { recursive: true });
    }
    
    const filePath = await join(tempDocsPath, `sagim_receipt_${Date.now()}.html`);
    
    // 2. Crear un documento HTML completo con estilos de tirilla
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Impresión de Recibo</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 0; }
          }
          body { 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10px; 
            background: white; 
            color: black;
            font-family: monospace; 
          }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 500)">
        ${htmlContent}
      </body>
      </html>
    `;
    
    // 3. Guardar el archivo
    await writeTextFile(filePath, fullHtml);
    
    // 4. Abrirlo en el navegador por defecto del usuario
    await openPath(filePath);
    
  } catch (err) {
    console.error("Error al generar archivo de impresión", err);
    // Fallback simple
    window.print();
  }
}
