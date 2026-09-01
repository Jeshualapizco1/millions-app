// ============================================================================
// Cola de movimientos capturados sin red.
//
// Registrar un gasto en la calle es justo cuando peor está la señal. En vez de
// perder la captura, se guarda en IndexedDB y se envía sola al volver la red.
//
// La clave para que esto sea seguro es la idempotencia: cada movimiento lleva
// un id generado en el teléfono, y `apply_transaction` lo ignora si ya lo
// recibió. Así, una respuesta perdida a mitad de camino no duplica el gasto
// cuando se reintenta.
// ============================================================================
import type { TxType } from "../types";

const DB = "millions";
const STORE = "cola";
const VERSION = 1;

export interface PendingTx {
  /** Id definitivo del movimiento: viaja al servidor y evita duplicados. */
  id: string;
  accountId: string;
  accountName: string;
  kind: TxType;
  amount: number;
  description: string;
  category: string;
  date: string;
  /** Intentos fallidos, para no reintentar en bucle algo que nunca va a entrar. */
  attempts: number;
  queuedAt: string;
}

const MAX_INTENTOS = 5;

const abrir = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await abrir();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
};

export const encolar = (p: PendingTx) => tx("readwrite", (s) => s.put(p));
export const listar = () => tx<PendingTx[]>("readonly", (s) => s.getAll());
export const obtener = (id: string) => tx<PendingTx | undefined>("readonly", (s) => s.get(id));
export const quitar = (id: string) => tx("readwrite", (s) => s.delete(id));

/** Marca un intento fallido; a las 5 veces se descarta para no reintentar eternamente. */
export const marcarIntento = async (p: PendingTx): Promise<"reintentar" | "descartado"> => {
  const next = { ...p, attempts: p.attempts + 1 };
  if (next.attempts >= MAX_INTENTOS) {
    await quitar(p.id);
    return "descartado";
  }
  await encolar(next);
  return "reintentar";
};

export const soportaCola = () => typeof indexedDB !== "undefined";

/**
 * ¿El fallo fue de sesión (JWT vencido, reloj desfasado, sin login)? No es
 * culpa del movimiento: se deja en la cola sin gastarle un intento. Antes
 * un JWT expirado al volver a la app consumía los 5 intentos en segundos y
 * descartaba un gasto real.
 */
export const esFalloDeSesion = (e: unknown): boolean => {
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return (
    msg.includes("jwt") ||
    msg.includes("sesión expirada") ||
    msg.includes("sesion expirada") ||
    msg.includes("no autenticado") ||
    msg.includes("not authenticated") ||
    msg.includes("refresh token") ||
    msg.includes("invalid claim") ||
    msg.includes("401")
  );
};

/**
 * ¿El fallo fue por falta de red? Solo eso se encola. Un rechazo del servidor
 * (monto inválido, cuenta ajena) no mejora reintentándolo: se reporta.
 */
export const esFalloDeRed = (e: unknown): boolean => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed") ||
    msg.includes("timeout")
  );
};
