import { useCallback, useRef, useState } from "react";
import { C } from "../lib/constants";

export interface Toast {
  id: number;
  kind: "ok" | "error";
  text: string;
  action?: { label: string; onClick: () => void };
}

/** Estado + API de toasts. Vive en App; `push` se pasa a los handlers. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">, ms = t.kind === "error" ? 5000 : 3500) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  return { toasts, push, dismiss };
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(env(safe-area-inset-bottom,0px) + 96px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 300, pointerEvents: "none", padding: "0 16px" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fadeUp"
          style={{
            pointerEvents: "auto",
            maxWidth: 420,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.card,
            border: `1px solid ${t.kind === "error" ? C.red : C.green}55`,
            borderLeft: `4px solid ${t.kind === "error" ? C.red : C.green}`,
            borderRadius: 14,
            padding: "12px 14px",
            boxShadow: "0 8px 24px #00000066",
          }}
        >
          <span style={{ fontSize: 16 }}>{t.kind === "error" ? "⚠️" : "✅"}</span>
          <span style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{t.text}</span>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
              style={{ background: C.accent + "22", color: C.aLight, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
        </div>
      ))}
    </div>
  );
}
