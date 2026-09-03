import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Contenedor nativo de Millions (decidido en PENDIENTES.md, sección G):
 * Capacitor envuelve la app web que ya existe. Lo que cambia respecto a la
 * PWA es solo lo que aquí se configura y lo que `src/lib/native.ts` decide
 * en tiempo de ejecución.
 *
 * ── POR QUÉ NO HAY BLOQUE `server` (G-D6, 3 de septiembre) ───────────────────
 *
 * Lo hubo: `server.hostname = "app.millionsapp.io"` con esquema https, para
 * que el WebView tuviera el mismo origen que la PWA y Turnstile validara por
 * dominio (G-D5). Salió caro y se quitó, por dos razones que se descubrieron
 * probando en el iPhone:
 *
 * 1. **Nada que viva en `hostname` se puede pedir por red.** En Android,
 *    Capacitor intercepta toda petición cuyo host sea el suyo y la resuelve
 *    contra los archivos de la app (`WebViewLocalServer.java` compara el host
 *    y devuelve el archivo local). Con el dominio real ahí,
 *    `https://app.millionsapp.io/.netlify/functions/chat` no salía nunca a
 *    internet: se buscaba dentro del bundle, no estaba, y fallaba. Obligaba a
 *    un host aparte para la API, y con él a un segundo sitio en Netlify,
 *    porque los dominios que no son el primario redirigen y un 301 volvía a
 *    caer en la interceptación.
 *
 * 2. **En iOS el `iosScheme: "https"` no se aplicaba.** WebKit no deja
 *    registrar un manejador para un esquema que ya maneja él, así que
 *    Capacitor lo descartaba y volvía al suyo (`CAPInstanceDescriptor.swift`,
 *    en `normalize()`). El origen real era `capacitor://app.millionsapp.io`,
 *    no `https://…`, y por eso medio motivo de todo esto —Turnstile por
 *    dominio— no se cumplía de todos modos.
 *
 * Sin `server`, el origen vuelve a ser el de Capacitor:
 * `capacitor://localhost` en iOS y `https://localhost` en Android. Los dos
 * están en la lista del CORS de `netlify/functions/chat.ts`. A cambio,
 * `app.millionsapp.io` queda libre para servir la PWA, la API y el AASA desde
 * un solo sitio, sin trampas.
 *
 * **Si algún día vuelve a hacer falta un hostname propio**, hay que recordar
 * las dos cosas de arriba: la API tiene que vivir en otro host, y el origen
 * de iOS no será el que diga `iosScheme`.
 */
const config: CapacitorConfig = {
  appId: "io.millionsapp.app",
  appName: "Millions - Finanzas con IA",
  webDir: "dist",
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
