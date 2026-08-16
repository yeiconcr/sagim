import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

function fixTailwindWebKit() {
  return {
    name: "fix-tailwind-webkit",
    enforce: "post" as const,
    generateBundle(_: any, bundle: any) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith(".css")) {
          let css = bundle[fileName].source as string;

          // 1. Remove the ENTIRE @layer properties fallback block that targets WebKit
          //    This block applies ~50 --tw-* custom properties on * for Safari/WebKit
          css = css.replace(/@layer properties\{@supports[^}]*\{[^}]*\}\}\}/g, "");

          // 2. Replace universal selectors in @layer base preflight with :where(html)
          //    box-sizing, border, margin, padding on * is very expensive in WebKit
          css = css.replace(
            /\*,:after,:before,::backdrop\{box-sizing:border-box;border:0 solid;margin:0;padding:0\}/g,
            ":where(html,body,div,span,section,article,aside,header,footer,main,nav,h1,h2,h3,h4,h5,h6,p,a,button,input,select,textarea,label,form,table,thead,tbody,tr,td,th,ul,ol,li,img,svg){box-sizing:border-box;border:0 solid;margin:0;padding:0}"
          );

          // 3. Replace our own *,::before,::after{border-color} with body-scoped
          css = css.replace(
            /\*,:before,:after\{border-color:#0000\}/g,
            ":where(html,body,div,span,section,article,aside,header,footer,main,nav,button,input,select,textarea){border-color:#0000}"
          );

          // 4. Strip the ::file-selector-button universal reset (rarely used)
          css = css.replace(
            /::file-selector-button\{box-sizing:border-box;border:0 solid;margin:0;padding:0\}/g,
            ""
          );

          bundle[fileName].source = css;
        }
      }
    }
  };
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), nodePolyfills({ protocolImports: true }), fixTailwindWebKit()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
          "react-pdf": ["@react-pdf/renderer"],
          "react-hook-form": ["react-hook-form", "@hookform/resolvers", "zod"],
          "radix-ui": [
            "@radix-ui/react-tabs",
            "@radix-ui/react-dialog",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-separator",
            "@radix-ui/react-toast",
          ],
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
