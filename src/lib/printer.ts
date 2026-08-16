export function printHtmlReceipt(htmlContent: string) {
  // Crear el contenedor de impresión
  const printDiv = document.createElement("div");
  printDiv.id = "pos-print-area";
  printDiv.innerHTML = htmlContent;
  document.body.appendChild(printDiv);

  // Inyectar estilos globales de impresión si no existen
  let style = document.getElementById("pos-print-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "pos-print-style";
    style.innerHTML = `
      @media screen {
        #pos-print-area { display: none !important; }
      }
      @media print {
        body > *:not(#pos-print-area) { display: none !important; }
        #pos-print-area { 
          display: block !important; 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 80mm; 
          margin: 0;
          padding: 0;
          background: white;
        }
        @page { margin: 0; size: 80mm auto; }
      }
    `;
    document.head.appendChild(style);
  }

  // Dar un pequeño tiempo para que el DOM se actualice y luego imprimir
  setTimeout(() => {
    window.print();
    
    // Limpiar el DOM después de imprimir
    setTimeout(() => {
      if (document.body.contains(printDiv)) {
        document.body.removeChild(printDiv);
      }
    }, 1000);
  }, 100);
}
