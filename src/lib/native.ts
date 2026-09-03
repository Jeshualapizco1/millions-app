// ============================================================================
// Lo que cambia cuando la app corre dentro del contenedor nativo.
//
// La misma build sirve para la PWA y para iOS/Android: aquí se decide en
// tiempo de ejecución. Todo lo que dependa de un plugin de Capacitor se
// carga de forma perezosa para que la PWA no arrastre código que no usa.
// ============================================================================
import { Capacitor } from "@capacitor/core";
import { procesarEnlace } from "./enlace";

/** true dentro de la app de iOS o Android; false en el navegador y la PWA. */
export const esNativo = (): boolean => Capacitor.isNativePlatform();

export const plataforma = (): "ios" | "android" | "web" => Capacitor.getPlatform() as "ios" | "android" | "web";

/**
 * Base absoluta para la función de IA. En la web es el mismo origen y basta
 * con la ruta relativa; en nativo hay que nombrar el servidor entero.
 *
 * **Tiene que ser un host distinto al del WebView, y por eso existe
 * `api.millionsapp.io`.** En Android, Capacitor sirve desde el bundle local
 * todo lo que se pida al `server.hostname` —`WebViewLocalServer.java` compara
 * el host de cada petición contra el suyo y la intercepta—, así que pedir a
 * `https://app.millionsapp.io/.netlify/functions/chat` nunca sale a la red:
 * se busca ese archivo dentro de la app, no existe, y falla. Con un host
 * aparte la petición viaja como cualquier otra.
 *
 * `VITE_API_BASE` sigue existiendo para apuntar a otro sitio al compilar (un
 * deploy de prueba, o mientras el dominio no responde), pero ya no hace falta
 * para que la app funcione: el valor bueno vive aquí.
 */
export const apiBase = (): string => {
  const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");
  if (base) return base;
  return esNativo() ? "https://api.millionsapp.io" : "";
};

/**
 * A dónde vuelven los enlaces de correo de Supabase.
 *
 * En la web, al propio origen donde corre la app (el sitio de Netlify hoy,
 * app.millionsapp.io cuando el dominio apunte): fijarlo al dominio nuevo
 * antes de tiempo rompería el registro de la web. En nativo, siempre al
 * dominio público, que el sistema reconoce como App Link / Universal Link y
 * abre la app en vez del navegador. Los dos deben estar en Supabase → Auth →
 * Redirect URLs.
 */
export const authOrigin = (): string => (esNativo() ? "https://app.millionsapp.io" : window.location.origin);

/**
 * Ajustes de arranque en nativo: barra de estado oscura sobre la vista,
 * splash fuera en cuanto React pintó, y el botón atrás de Android cierra lo
 * que esté abierto en vez de matar la app. Se llama una vez desde main.tsx.
 */
export async function arrancarNativo(): Promise<void> {
  if (!esNativo()) return;
  document.documentElement.classList.add("nativo");

  const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }, { App }] = await Promise.all([
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
    import("@capacitor/keyboard"),
    import("@capacitor/app"),
  ]);

  try { await StatusBar.setStyle({ style: Style.Dark }); } catch { /* iOS sin plugin en simulador viejo */ }
  try { await StatusBar.setOverlaysWebView({ overlay: true }); } catch { /* solo Android */ }
  try { await SplashScreen.hide(); } catch { /* ya oculto */ }
  try { await Keyboard.setAccessoryBarVisible({ isVisible: false }); } catch { /* solo iOS */ }

  // Deep links: el enlace de confirmación o recuperación abre la app con la
  // URL completa; se le saca el `code` y se cambia por una sesión.
  App.addListener("appUrlOpen", ({ url }) => {
    void procesarEnlace(url, async (code) => {
      // Dinámico a propósito: native.ts lo importa api.ts, y el cliente de
      // Supabase solo debe construirse cuando de verdad hace falta.
      const { sbClient } = await import("./supabase");
      const { error } = await sbClient.auth.exchangeCodeForSession(code);
      if (error) console.warn("deep link:", error.message);
    });
  });

  // Botón atrás de Android: si hay un diálogo abierto, Escape lo cierra (los
  // modales y el sheet ya escuchan Escape); si no hay nada abierto, la app se
  // manda al fondo en vez de cerrarse, que es lo que hace cualquier app nativa.
  App.addListener("backButton", () => {
    const abierto = document.querySelector('[role="dialog"]');
    if (abierto) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } else {
      App.minimizeApp();
    }
  });
}

/** Un toque háptico breve al confirmar algo que mueve dinero. Silencioso en web. */
export async function vibrar(): Promise<void> {
  if (!esNativo()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* sin motor háptico */ }
}
