import { useEffect, useRef, useState, type ReactNode } from "react";
import { C, MOTION, S, T } from "../lib/constants";
import { reducedMotion } from "../lib/appearance";

let scrollLocks = 0;
let originalOverflow = "";

/** Diálogo nativo: fondo inerte, foco contenido y cierre protegido si hay cambios. */
export default function Modal({ onClose, children, dirty = false, label = "Revisar datos", className = "", busy = false }: {
  onClose: () => void; children: ReactNode; dirty?: boolean; label?: string; className?: string; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const state = useRef({ onClose, dirty, busy });
  state.current = { onClose, dirty, busy };
  const closing = useRef(false);
  const animation = useRef<Animation | null>(null);
  const mounted = useRef(false);
  const close = () => {
    if (closing.current || state.current.busy) return;
    closing.current = true;
    const finish = () => { if (mounted.current) state.current.onClose(); };
    if (reducedMotion() || !body.current?.animate) { finish(); return; }
    animation.current?.cancel();
    animation.current = body.current.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(16px)" }], { duration: MOTION.fade, easing: MOTION.ease, fill: "forwards" });
    animation.current.finished.then(finish).catch(() => {});
  };
  const attempt = () => { if (state.current.busy) return; if (state.current.dirty) setConfirmando(true); else close(); };
  const attemptRef = useRef(attempt); attemptRef.current = attempt;
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    if (scrollLocks++ === 0) { originalOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    ref.current?.showModal();
    // Escape sintético lo emite el botón atrás de Capacitor.
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && Array.from(document.querySelectorAll("dialog[open]")).slice(-1)[0] === ref.current) { event.preventDefault(); event.stopPropagation(); attemptRef.current(); } };
    document.addEventListener("keydown", key);
    return () => { mounted.current = false; animation.current?.cancel(); document.removeEventListener("keydown", key); ref.current?.close(); if (--scrollLocks === 0) document.body.style.overflow = originalOverflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} role="dialog" aria-modal="true" aria-label={label} className={`million-sheet ${className}`} onCancel={(e) => { e.preventDefault(); attempt(); }} onClick={(e) => { if (e.target === e.currentTarget) attempt(); }}>
    <div ref={body} className="million-sheet-body" aria-busy={busy}>
      <div aria-hidden="true" style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }}/>
      {confirmando && <div role="alert" style={{ background: C.amber + "18", border: `1px solid ${C.amber}55`, borderRadius: 15, padding: 14, marginBottom: 16 }}><p style={{ fontSize: T.md, marginBottom: 10 }}>Tienes cambios sin guardar.</p><div style={{ display: "flex", gap: 8 }}><button onClick={() => setConfirmando(false)} style={S.btn()}>Seguir editando</button><button onClick={close} style={S.btnO}>Descartar y cerrar</button></div></div>}
      {children}
    </div>
  </dialog>;
}
