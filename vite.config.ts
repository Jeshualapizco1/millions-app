import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Netlify expone COMMIT_REF en el build. Va al registro de errores para
  // poder atar un fallo al despliegue exacto que lo introdujo.
  define: {
    __COMMIT__: JSON.stringify((process.env.COMMIT_REF || "local").slice(0, 7)),
  },
  build: {
    rollupOptions: {
      output: {
        // Separar las librerías del código de la app: al desplegar un cambio
        // propio, el navegador reusa los vendors ya cacheados en vez de
        // volver a bajar 600 KB. Chart.js sale aparte porque solo lo necesita
        // el dashboard y se carga de forma diferida.
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          charts: ["chart.js/auto"],
        },
      },
    },
  },
});
