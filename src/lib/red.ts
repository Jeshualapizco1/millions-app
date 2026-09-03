// ============================================================================
// Qué decirle a la persona cuando una llamada al servidor no llega.
//
// Un `fetch` que no alcanza su destino suena siempre igual: "Load failed" en
// iOS, "Failed to fetch" en Chrome. El navegador **no dice** si fue falta de
// red, un DNS que no resuelve o un CORS rechazado, y lo oculta a propósito:
// distinguirlos permitiría escanear la red de quien visita una página desde
// esa página. Así que prometer "esto fue CORS" sería inventar.
//
// Lo que sí se puede decir, y es lo que de verdad ayuda, es **a qué** no se
// pudo llegar. Con el host delante, "no pude conectar con app.millionsapp.io"
// y "no pude conectar con millionsjeshua.netlify.app" separan a simple vista
// dos causas que cuestan una tarde cada una: un build sin `VITE_API_BASE`
// apuntando a un dominio que todavía no existe, y un servidor que no responde.
//
// Un CORS rechazado, en cambio, sí se puede comprobar desde fuera en un
// segundo, y así fue como se descartó esta vez:
//
//   curl -i -X OPTIONS https://<servidor>/.netlify/functions/chat \
//     -H "Origin: https://app.millionsapp.io" \
//     -H "Access-Control-Request-Method: POST"
//
// Si eso responde 204 con `access-control-allow-origin`, el CORS está bien y
// el problema es otro.
// ============================================================================
import { esFalloDeRed } from "./offlineQueue";

/** El host de una URL, o la URL entera si no se puede leer. */
export const hostDe = (url: string): string => {
  try {
    return new URL(url, typeof location !== "undefined" ? location.href : "https://millions.local").host;
  } catch {
    return url;
  }
};

/**
 * El aviso para un fetch que no llegó. `null` si el fallo no fue de conexión
 * —entonces lo explica el estado HTTP, que sí dice algo.
 */
export function mensajeDeFalloDeRed(e: unknown, url: string): string | null {
  if (!esFalloDeRed(e)) return null;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Sin conexión. Lo que registres se guarda aquí y se manda solo cuando vuelva el internet.";
  }
  return `No pude conectar con ${hostDe(url)}. Revisa tu conexión; si tienes internet, ese servidor no está respondiendo.`;
}

/**
 * El aviso para una respuesta que sí llegó pero trae un estado de error.
 *
 * `delServidor` es el `error` del cuerpo: cuando existe manda, porque el
 * servidor sabe mejor que nosotros por qué dijo que no —el tope diario, por
 * ejemplo, sale de ahí con su número.
 */
export function mensajeDeEstadoHttp(status: number, url: string, delServidor?: string | null): string {
  if (delServidor) return delServidor;

  if (status === 401 || status === 403) return "Tu sesión venció. Cierra sesión y entra otra vez.";
  if (status === 404) return `El servidor respondió, pero ahí no está la función de IA (404 en ${hostDe(url)}).`;
  if (status === 429) return "Llegaste al tope de consultas por hoy. Mañana se reinicia.";
  if (status >= 500) return `El servidor tuvo un problema (${status}). No es culpa tuya; inténtalo en un momento.`;
  return `El servidor rechazó la petición (${status}).`;
}
