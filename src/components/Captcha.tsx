import { useEffect, useRef } from "react";

/**
 * Captcha de Cloudflare Turnstile para el registro.
 *
 * Sin esto, cualquiera puede automatizar la creación de cuentas y agotar el
 * presupuesto de IA en una noche.
 *
 * Está escrito para degradar solo: si no hay `VITE_TURNSTILE_SITE_KEY`, el
 * componente no pinta nada y avisa que no hay token. Así el código puede vivir
 * en producción antes de tener la llave, y activarse con una variable.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

export const CAPTCHA_ENABLED = !!import.meta.env.VITE_TURNSTILE_SITE_KEY;

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let cargando: Promise<void> | null = null;
const cargarScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (cargando) return cargando;
  cargando = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("No se pudo cargar el captcha"));
    document.head.appendChild(el);
  });
  return cargando;
};

export default function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!CAPTCHA_ENABLED || !box.current) return;
    let vivo = true;

    cargarScript()
      .then(() => {
        if (!vivo || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: "dark",
          language: "es",
          callback: (token: string) => cb.current(token),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => {
        // Si el captcha no carga, no se bloquea el registro en silencio:
        // se deja pasar sin token y el servidor decidirá.
        cb.current(null);
      });

    return () => {
      vivo = false;
      if (widget.current && window.turnstile) {
        try { window.turnstile.remove(widget.current); } catch { /* ya removido */ }
      }
    };
  }, []);

  if (!CAPTCHA_ENABLED) return null;
  return <div ref={box} style={{ marginBottom: 14, display: "flex", justifyContent: "center" }} />;
}
