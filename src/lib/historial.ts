// ============================================================================
// La carga del historial en dos tiempos (D9).
//
// El arranque trae solo los meses que el tablero necesita y el resto llega
// después, en segundo plano. El problema de que llegue después es que entre
// una carga y otra la persona pudo registrar un gasto: si la segunda respuesta
// pisara el estado, ese movimiento desaparecería de la pantalla aunque esté
// guardado, y con la cola offline ni siquiera estaría en el servidor todavía.
// Por eso las dos listas se fusionan en vez de reemplazarse.
// ============================================================================
import type { Transaction } from "../types";

/** Meses que carga el arranque. */
export const VENTANA_MESES = 12;

/**
 * Une lo que vino del servidor con lo que ya había en pantalla.
 *
 * La respuesta del servidor es la verdad, y por eso lo que está en memoria
 * pero no en ella se descarta: así un movimiento borrado desde otro
 * dispositivo desaparece de verdad, en vez de revivir en cada fusión.
 *
 * `protegidos` es la excepción, y son los dos casos en que la ausencia no
 * significa "ya no existe":
 *
 *  - lo que la cola offline todavía no sube, que el servidor no puede conocer;
 *  - lo que se capturó mientras la respuesta viajaba, que salió del servidor
 *    antes de existir.
 *
 * El orden es el mismo que usa la consulta —fecha descendente y el id como
 * desempate— para que la lista no salte cuando entra la segunda carga.
 */
export const fusionarTxs = (
  delServidor: Transaction[],
  enMemoria: Transaction[],
  protegidos: ReadonlySet<string> = new Set()
): Transaction[] => {
  const porId = new Map<string, Transaction>();
  for (const t of enMemoria) if (protegidos.has(t.id)) porId.set(t.id, t);
  for (const t of delServidor) porId.set(t.id, t);

  return [...porId.values()].sort((a, b) => {
    const d = new Date(b.date).getTime() - new Date(a.date).getTime();
    return d !== 0 ? d : (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
  });
};
