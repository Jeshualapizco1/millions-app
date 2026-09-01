import { useEffect, useRef } from "react";

/**
 * Vuelve a cargar los datos cuando la persona regresa a la app tras un rato.
 *
 * La PWA no se cierra: se queda en segundo plano días. Los movimientos fijos
 * que el cron registra a las 6:00 no aparecían hasta que alguien recargaba a
 * mano, así que el saldo de la mañana era el de ayer sin que nada lo dijera.
 *
 * Con margen, no en cada cambio de pestaña: volver a la app veinte veces en
 * una hora no son veinte cargas completas.
 */
export function useRefrescoAlVolver({
  refrescar,
  puedeRefrescar,
  minutos = 5,
}: {
  refrescar: () => Promise<void>;
  /** Falso mientras haya algo sin enviar: recargar borraría lo que está en cola. */
  puedeRefrescar: () => boolean;
  minutos?: number;
}) {
  const ultimo = useRef(Date.now());
  const cbs = useRef({ refrescar, puedeRefrescar });
  cbs.current = { refrescar, puedeRefrescar };

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimo.current < minutos * 60_000) return;
      if (!cbs.current.puedeRefrescar()) return;
      // Se marca ANTES de pedir: dos eventos seguidos (visibilitychange y
      // focus llegan juntos al desbloquear el teléfono) no disparan dos cargas.
      ultimo.current = Date.now();
      void cbs.current.refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [minutos]);
}
