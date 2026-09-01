import { useEffect, useRef, useState, type ReactNode } from "react";
import { C, R, S, T } from "../lib/constants";

/**
 * El sheet que usan todos los formularios.
 *
 * Antes era un div con fondo: sin rol, sin Escape, el foco se salía al
 * contenido de atrás con Tab, la página de fondo seguía haciendo scroll, y
 * un toque fuera descartaba un formulario a medio llenar sin preguntar.
 *
 * - `dirty`: si viene en true, cerrar (fondo o Escape) pide confirmación en
 *   una franja dentro del propio sheet, no con window.confirm (que bloquea y
 *   se ve ajeno). Los botones Cancelar de cada formulario siguen cerrando
 *   directo: ahí la persona ya decidió.
 * - `92dvh` y no `vh`: en iPhone `vh` no descuenta la barra del navegador y
 *   el botón de guardar quedaba debajo.
 */
export default function Modal({
  onClose,
  children,
  dirty = false,
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  /** Hay cambios sin guardar: cerrar por fondo o Escape pregunta primero. */
  dirty?: boolean;
  /** Nombre accesible del diálogo. Sin él, el lector lee el primer texto. */
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const estado = useRef({ dirty, onClose });
  estado.current = { dirty, onClose };

  const intentarCerrar = () => {
    if (estado.current.dirty) setConfirmando(true);
    else estado.current.onClose();
  };

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const el = ref.current;
    const enfocables = () =>
      Array.from(el?.querySelectorAll<HTMLElement>('input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])') ?? [])
        .filter((x) => !x.hasAttribute("disabled"));
    // Si un hijo trae autoFocus ya tiene el foco; si no, el primero que se pueda.
    if (!el?.contains(document.activeElement)) enfocables()[0]?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        intentarCerrar();
        return;
      }
      if (e.key !== "Tab") return;
      const f = enfocables();
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
    // Solo al montar: `dirty` y `onClose` se leen del ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, animation: "fadeIn 0.15s ease" }}
      onClick={intentarCerrar}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "92dvh", overflowY: "auto", animation: "slideUp 0.22s ease", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />
        {confirmando && (
          <div role="alertdialog" aria-label="Cambios sin guardar" style={{ background: C.amber + "18", border: `1px solid ${C.amber}55`, borderRadius: R.md, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: T.md, fontWeight: 700, color: C.amber, marginBottom: 10 }}>Tienes cambios sin guardar</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setConfirmando(false)} style={{ ...S.btn(), flex: 2, padding: "9px 14px", fontSize: T.md }}>Seguir editando</button>
              <button type="button" onClick={() => estado.current.onClose()} style={{ ...S.btnO, flex: 1, padding: "9px 14px", fontSize: T.md, color: C.amber, borderColor: C.amber + "66" }}>Descartar</button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
