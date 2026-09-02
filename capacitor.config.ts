import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Contenedor nativo de Millions (decidido en PENDIENTES.md, sección G):
 * Capacitor envuelve la app web que ya existe. Lo que cambia respecto a la
 * PWA es solo lo que aquí se configura y lo que `src/lib/native.ts` decide
 * en tiempo de ejecución.
 *
 * `server.hostname` con esquema https (G-D5): dentro del WebView el origen
 * deja de ser `capacitor://localhost` y pasa a ser `https://app.millionsapp.io`,
 * el mismo dominio de la PWA. Con eso Turnstile valida por dominio, las
 * cookies y el almacenamiento se comportan como en la web, y Supabase ve un
 * origen que ya conoce. No carga nada de la red: los archivos siguen siendo
 * locales, solo cambia cómo se llama el origen.
 */
const config: CapacitorConfig = {
  appId: "io.millionsapp.app",
  appName: "Millions - Finanzas con IA",
  webDir: "dist",
  server: {
    hostname: "app.millionsapp.io",
    androidScheme: "https",
    iosScheme: "https",
  },
  android: {
    // La app decide su propio fondo; sin esto Android pinta blanco un instante.
    backgroundColor: "#0a0a0f",
  },
  ios: {
    backgroundColor: "#0a0a0f",
    contentInset: "never",
    // Sin rebote al llegar al borde: es un gesto de navegador, no de app.
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0a0a0f",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#12121a",
      overlaysWebView: true,
    },
    Keyboard: {
      // `body`: la vista se encoge y el campo enfocado queda visible; con
      // `native` el teclado tapa el botón de guardar de los sheets.
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
