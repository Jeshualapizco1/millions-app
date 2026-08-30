// ============================================================================
// Registro de errores en la propia base del usuario.
//
// Antes los fallos morían en console.error y nadie se enteraba. Ahora quedan
// en `client_errors`, con la ruta, la acción y el commit desplegado, para
// poder diagnosticar después sin depender de un servicio externo.
//
// Tres reglas de diseño, todas para que el registro nunca estorbe:
//  1. Jamás lanza. Un error dentro del registrador de errores sería absurdo.
//  2. No bloquea: se dispara y se olvida.
//  3. Se calla solo. Un fallo en bucle no debe generar mil filas.
// ============================================================================
import { sbClient } from "./supabase";

const VENTANA_REPETIDO_MS = 60_000;
const MAX_POR_SESION = 20;

const vistos = new Map<string, number>();
let enviados = 0;

/** Ruido del navegador que no dice nada del estado de la app. */
const IGNORAR = [
  "ResizeObserver loop",
  "Non-Error promise rejection captured",
  "Load failed",
  "NetworkError when attempting to fetch resource",
];

const esRuido = (msg: string) => IGNORAR.some((n) => msg.includes(n));

export interface ErrorContext {
  /** Qué intentaba hacer el usuario: "eliminar transacción", "importar CSV"… */
  action?: string;
  [k: string]: unknown;
}

export async function logError(error: unknown, context: ErrorContext = {}): Promise<void> {
  try {
    if (enviados >= MAX_POR_SESION) return;

    const err = error instanceof Error ? error : new Error(String(error));
    const message = (err.message || "Error desconocido").slice(0, 500);
    if (esRuido(message)) return;

    // Mismo error dos veces en un minuto: se registra una sola vez
    const ahora = Date.now();
    const clave = `${message}|${context.action ?? ""}`;
    const previo = vistos.get(clave);
    if (previo && ahora - previo < VENTANA_REPETIDO_MS) return;
    vistos.set(clave, ahora);

    const { data } = await sbClient.auth.getSession();
    const userId = data.session?.user.id;
    // Sin sesión no hay dónde guardarlo: RLS exige user_id.
    if (!userId) return;

    enviados++;
    await sbClient.from("client_errors").insert({
      user_id: userId,
      message,
      stack: err.stack?.slice(0, 4000) ?? null,
      context: {
        ...context,
        url: typeof location !== "undefined" ? location.pathname + location.search : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
        commit: __COMMIT__,
        standalone: typeof matchMedia !== "undefined" ? matchMedia("(display-mode: standalone)").matches : undefined,
      },
    });
  } catch {
    // Silencio deliberado: el registrador no puede romper la app.
  }
}

/** Captura lo que nadie atrapó: errores sueltos y promesas rechazadas. */
export function installErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (e) => {
    logError(e.error ?? e.message, { action: "error no capturado", source: e.filename, line: e.lineno });
  });

  window.addEventListener("unhandledrejection", (e) => {
    logError(e.reason, { action: "promesa rechazada sin manejar" });
  });
}
