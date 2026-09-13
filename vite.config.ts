import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { publicClientConfig } from "./scripts/native-config.mjs";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  const commit = process.env.COMMIT_REF || "local";
  return {
  plugins: [react(), {
    name: "millions-public-client-config",
    apply: "build",
    generateBundle() {
      // Los mismos valores públicos del bundle; ninguna variable privada.
      // Capacitor puede reproducir la configuración del despliegue verificado.
      this.emitFile({ type: "asset", fileName: "client-config.json", source: JSON.stringify(publicClientConfig(env, commit), null, 2) + "\n" });
    },
  }],
  // Netlify expone COMMIT_REF en el build. Va al registro de errores para
  // poder atar un fallo al despliegue exacto que lo introdujo.
  define: {
    __COMMIT__: JSON.stringify(commit.slice(0, 7)),
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
  };
});
