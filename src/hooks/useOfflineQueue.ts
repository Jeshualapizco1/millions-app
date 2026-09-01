import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { logError } from "../lib/errorLog";
import { encolar, esFalloDeRed, esFalloDeSesion, listar, marcarIntento, obtener, quitar, soportaCola, type PendingTx } from "../lib/offlineQueue";

/**
 * Vacía la cola cuando hay red. Se dispara al volver la conexión, al volver a
 * la app y una vez al arrancar — los tres momentos en que un movimiento
 * pendiente puede por fin salir.
 */
export function useOfflineQueue({
  onSynced,
  onDropped,
}: {
  /** Un movimiento entró al servidor: App recarga saldos. */
  onSynced: (n: number) => void;
  /** Se agotaron los reintentos y se descartó. */
  onDropped: (p: PendingTx) => void;
}) {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Candado real. `syncing` es estado y los listeners de abajo se instalan
  // una sola vez con el flush del primer render, así que siempre lo veían en
  // false: "online" y "visibilitychange" al volver a la app lanzaban dos
  // vaciados a la vez sobre la misma cola.
  const vaciando = useRef(false);

  const refresh = useCallback(async () => {
    if (!soportaCola()) return;
    try {
      setPending((await listar()).length);
    } catch { /* la cuenta pendiente no es crítica */ }
  }, []);

  const flush = useCallback(async () => {
    if (!soportaCola() || vaciando.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    vaciando.current = true;
    setSyncing(true);
    let ok = 0;
    try {
      let items: PendingTx[];
      try {
        items = await listar();
      } catch {
        return;
      }
      if (!items.length) return;

      for (const p of items) {
        try {
          await api.applyTx(
            { accountId: p.accountId, kind: p.kind, amount: p.amount, description: p.description, category: p.category, clientId: p.id, date: p.date },
            []
          );
          await quitar(p.id);
          ok++;
        } catch (e) {
          if (esFalloDeRed(e)) break; // sigue sin red: se deja para después
          // Sin sesión válida nada va a entrar, y no es culpa del movimiento:
          // se deja intacto y se vuelve a intentar cuando la haya.
          if (esFalloDeSesion(e)) break;
          // El servidor lo rechazó: reintentar no lo va a arreglar solo
          const r = await marcarIntento(p);
          if (r === "descartado") {
            logError(e, { action: "movimiento offline descartado", description: p.description, amount: p.amount });
            onDropped(p);
          }
        }
      }
    } finally {
      vaciando.current = false;
      setSyncing(false);
    }
    await refresh();
    if (ok) onSynced(ok);
  }, [refresh, onSynced, onDropped]);

  /**
   * ¿Este movimiento sigue esperando a salir? Un movimiento en cola no existe
   * todavía en el servidor: borrarlo o editarlo con las RPC fallaría, y al
   * sincronizar reaparecería el original.
   */
  const enCola = useCallback(async (id: string): Promise<PendingTx | null> => {
    if (!soportaCola()) return null;
    try {
      return (await obtener(id)) ?? null;
    } catch {
      return null;
    }
  }, []);

  /** Lo saca de la cola: es el "borrar" de un movimiento que nunca se envió. */
  const quitarDeCola = useCallback(async (id: string) => {
    await quitar(id);
    await refresh();
  }, [refresh]);

  /** Lo corrige en la cola, conservando su id para que siga siendo idempotente. */
  const corregirEnCola = useCallback(async (p: PendingTx) => {
    await encolar(p);
    await refresh();
  }, [refresh]);

  /** Guarda un movimiento para enviarlo cuando haya red. */
  const enqueue = useCallback(async (p: Omit<PendingTx, "attempts" | "queuedAt">) => {
    await encolar({ ...p, attempts: 0, queuedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    flush();
    const alVolver = () => flush();
    const alEnfocar = () => { if (document.visibilityState === "visible") flush(); };
    window.addEventListener("online", alVolver);
    document.addEventListener("visibilitychange", alEnfocar);
    return () => {
      window.removeEventListener("online", alVolver);
      document.removeEventListener("visibilitychange", alEnfocar);
    };
    // Solo al montar: flush se recrea con cada cambio de estado y no queremos
    // reinstalar los listeners en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pending, syncing, enqueue, flush, refresh, enCola, quitarDeCola, corregirEnCola };
}
