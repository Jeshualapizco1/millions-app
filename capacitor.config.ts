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
 *
 * ── DOS TRAMPAS QUE ESTO TRAE, Y QUE COSTARON UNA TARDE ──────────────────────
 *
 * 1. **Nada que viva en `hostname` se puede pedir por red.** En Android,
 *    Capacitor intercepta toda petición cuyo host sea este y la resuelve
 *    contra los archivos de la app (`WebViewLocalServer.java`: compara el host
 *    y devuelve el archivo local). Así que
 *    `https://app.millionsapp.io/.netlify/functions/chat` no sale nunca a
 *    internet: se busca dentro del bundle, no está, y falla. Por eso la API
 *    vive en **`api.millionsapp.io`**, un host aparte —ver `apiBase()` en
 *    `src/lib/native.ts`—. Cualquier cosa que haya que pedir por red tiene que
 *    estar en otro host que este.
 *
 * 2. **En iOS este `iosScheme` no se aplica.** WebKit no permite registrar un
 *    manejador para un esquema que ya maneja él, así que Capacitor lo descarta
 *    y vuelve al suyo (`CAPInstanceDescriptor.swift`, en `normalize()`:
 *    `WKWebView.handlesURLScheme("https")` es true → el esquema se reemplaza
 *    por `capacitor`). El origen real en iPhone es
 *    **`capacitor://app.millionsapp.io`**, no `https://…`. Consecuencias: ese
 *    es el origen que hay que permitir en el CORS de `netlify/functions/chat.ts`,
 *    y **Turnstile no puede validar por dominio en iOS**, que era medio motivo
 *    de G-D5. En Android sí, porque ahí el esquema https sí se respeta.
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
