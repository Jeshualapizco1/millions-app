import { useState } from "react";
import ErrorBox from "../components/ErrorBox";
import Modal from "../components/Modal";
import { C, R, S, T } from "../lib/constants";
import type { Category, CategoryKind } from "../types";

const ICONS = ["📦", "🍔", "🚗", "💊", "📚", "🎬", "💡", "🛍️", "💼", "🌸", "↔️", "🏠", "✈️", "🎁", "🐶", "💅", "⚽", "🎮", "☕", "🧾"];
const COLORS = ["#f97316", "#3b82f6", "#ec4899", "#0ea5e9", "#a855f7", "#eab308", "#06b6d4", "#10b981", "#4ade80", "#8b5cf6", "#6b7280", "#f43f5e"];

const KINDS: { key: CategoryKind; label: string }[] = [
  { key: "gasto", label: "Gasto" },
  { key: "ingreso", label: "Ingreso" },
  { key: "ambos", label: "Ambos" },
];

type Draft = { id?: string; name: string; icon: string; color: string; kind: CategoryKind };
const empty: Draft = { name: "", icon: "📦", color: "#6b7280", kind: "gasto" };

/** Gestión de categorías: crear, renombrar, cambiar icono/color y ocultar. */
export default function CategoriesModal({
  categories,
  onSave,
  onToggleHidden,
  onClose,
}: {
  categories: Category[];
  onSave: (d: Draft) => Promise<void>;
  onToggleHidden: (c: Category) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setError("Ponle un nombre"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave({ ...draft, name: draft.name.trim() });
      setDraft(null);
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  if (draft) {
    return (
      <Modal onClose={() => setDraft(null)}>
        <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>{draft.id ? "Editar categoría" : "Nueva categoría"}</div>
        <label style={S.lbl}>Nombre</label>
        <input autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder="Ej: Mascotas, Gimnasio" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

        <label style={S.lbl}>Se usa para</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {KINDS.map((k) => (
            <button key={k.key} onClick={() => setDraft({ ...draft, kind: k.key })} style={{ flex: 1, padding: "9px", borderRadius: R.md, border: `2px solid ${draft.kind === k.key ? C.accent : C.border + "44"}`, background: draft.kind === k.key ? C.accent + "22" : "transparent", color: draft.kind === k.key ? C.aLight : C.muted, cursor: "pointer", fontWeight: 700, fontSize: T.md }}>{k.label}</button>
          ))}
        </div>

        <label style={S.lbl}>Ícono</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {ICONS.map((ic) => (
            <button key={ic} onClick={() => setDraft({ ...draft, icon: ic })} style={{ fontSize: T.xxl, background: draft.icon === ic ? C.accent + "33" : "transparent", border: `2px solid ${draft.icon === ic ? C.accent : C.border + "44"}`, borderRadius: R.sm, padding: "4px 7px", cursor: "pointer" }}>{ic}</button>
          ))}
        </div>

        <label style={S.lbl}>Color</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {COLORS.map((col) => (
            <button key={col} onClick={() => setDraft({ ...draft, color: col })} style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: `3px solid ${draft.color === col ? "#fff" : col + "44"}`, cursor: "pointer" }} />
          ))}
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.btnO, flex: 1 }} onClick={() => setDraft(null)}>Cancelar</button>
          <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Guardar"}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: T.xl }}>Categorías</div>
        <button onClick={() => setDraft(empty)} style={{ ...S.btn(), padding: "7px 13px", fontSize: T.md }}>＋ Nueva</button>
      </div>
      <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 14 }}>
        Ocultar una categoría la quita de los selectores; los movimientos que ya la usan la conservan.
      </div>
      {categories.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}22`, opacity: c.hidden ? 0.45 : 1 }}>
          <div onClick={() => setDraft({ id: c.id, name: c.name, icon: c.icon, color: c.color, kind: c.kind })} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer", minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: R.sm, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{c.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: T.base, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ fontSize: T.xs, color: C.muted }}>{c.kind === "ambos" ? "gasto e ingreso" : c.kind}{c.hidden ? " · oculta" : ""}</div>
            </div>
          </div>
          <button onClick={() => onToggleHidden(c)} title={c.hidden ? "Mostrar" : "Ocultar"} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15, padding: 4 }}>
            {c.hidden ? "👁" : "🚫"}
          </button>
        </div>
      ))}
      <button style={{ ...S.btnO, width: "100%", marginTop: 16 }} onClick={onClose}>Cerrar</button>
    </Modal>
  );
}
