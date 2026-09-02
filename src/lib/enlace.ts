/**
 * Un enlace de correo abrió la app: si trae `code`, se cambia por sesión.
 * Devuelve true si había algo que procesar.
 *
 * Vive aparte de native.ts porque es lógica pura y se prueba: native.ts toca
 * el cliente de Supabase, que exige variables de entorno al cargarse y
 * reventaría las pruebas en CI (la regla de CLAUDE.md).
 */
export async function procesarEnlace(url: string, exchange: (code: string) => Promise<unknown>): Promise<boolean> {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  const code = u.searchParams.get("code");
  if (!code) return false;
  await exchange(code);
  return true;
}
