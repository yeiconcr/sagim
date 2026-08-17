import { invoke } from "@tauri-apps/api/core";

export async function printHtmlReceipt(htmlContent: string) {
  try {
    // 1. Crear el contenedor del ticket si no existe
    let container = document.getElementById("sagim-pos-receipt-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "sagim-pos-receipt-container";
      document.body.appendChild(container);
    }
    
    // 2. Inyectar el HTML del ticket
    container.innerHTML = htmlContent;
    
    // 3. Activar el modo de impresión POS (Oculta #root en CSS y muestra el ticket)
    document.body.classList.add("sagim-printing-pos");
    
    // 4. Esperar un momento a que el DOM y posibles imágenes se carguen
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // 5. Llamar a la función nativa de Tauri para imprimir
    await invoke("print_page");
    
    // 6. Limpieza post-impresión
    setTimeout(() => {
      document.body.classList.remove("sagim-printing-pos");
      if (container) {
        container.innerHTML = "";
      }
    }, 1000);

    return true;
  } catch (error) {
    console.error("Error al imprimir recibo:", error);
    // Asegurar limpieza en caso de error
    document.body.classList.remove("sagim-printing-pos");
    return false;
  }
}
