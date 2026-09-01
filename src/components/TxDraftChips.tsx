import { useCategories } from "../lib/categories";
import { C, S, T } from "../lib/constants";
import { fmt } from "../lib/format";
import type { TxDraft } from "../hooks/useAI";
import type { Account } from "../types";

/**
 * Lo que la captura entendió, editable antes de guardar.
 *
 * Existe porque antes no había ningún momento entre "hablaste" y "quedó
 * escrito en la base": lo que el modelo decidiera se guardaba, y una categoría
 * mal puesta solo aparecía semanas después revisando el historial. Los cuatro
 * campos son exactamente los que puede equivocar — monto, si suma o resta,
 * de qué cuenta sale y bajo qué categoría — y ninguno se puede corregir
 * después sin ir a buscar el movimiento.
 */
export default function TxDraftChips({
  draft,
  error,
  accs,
  busy,
  update,
  onConfirm,
  onDiscard,
}: {
  draft: TxDraft;
  error: string | null;
  accs: Account[];
  busy: boolean;
  update: (patch: Partial<TxDraft>) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const { list, look } = useCategories();
  const cat = look(draft.category || "Otros");
  const esGasto = draft.type === "gasto";
  const signo = esGasto ? C.red : C.green;

  /** Pastilla: el borde dice "esto se puede tocar" sin gritar. */
  const chip = (color: string) => ({
    ...S.inp,
    width: "auto",
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    padding: "10px 12px",
    fontSize: T.base,
    fontWeight: 700,
    border: `1px solid ${color}55`,
    background: color + "14",
    color,
    appearance: "none" as const,
  });

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Lo que se dictó, tal cual: es la referencia para saber qué se corrige */}
      <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 10, fontStyle: "italic", lineHeight: 1.4 }}>
        “{draft.dicho}”
      </div>

      <input
        style={{ ...S.inp, marginBottom: 8, fontWeight: 600 }}
        value={draft.description}
        placeholder="Descripción"
        onChange={(e) => update({ description: e.target.value })}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: signo, fontSize: T.base, fontWeight: 800, pointerEvents: "none" }}>
            {esGasto ? "−" : "+"}$
          </span>
          <input
            type="number"
            inputMode="decimal"
            style={{ ...chip(signo), width: "100%", paddingLeft: 32 }}
            value={draft.amount}
            onChange={(e) => update({ amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        {/* Gasto o ingreso es la equivocación más cara posible: los mismos
            $5,000 suman o restan según esto, así que se toca de un golpe. */}
        <button
          onClick={() => update({ type: esGasto ? "ingreso" : "gasto" })}
          style={{ ...chip(signo), flex: "0 0 auto", cursor: "pointer", textAlign: "center" }}
        >
          {esGasto ? "🔴 Gasto" : "🟢 Ingreso"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: error ? 8 : 14 }}>
        <select
          style={chip(draft.accountName ? C.aLight : C.amber)}
          value={draft.accountName ?? ""}
          onChange={(e) => update({ accountName: e.target.value })}
        >
          {/* Vacío solo cuando el modelo nombró una cuenta que no existe */}
          {!draft.accountName && <option value="">Elige cuenta</option>}
          {accs.map((a) => <option key={a.id} value={a.name}>{a.icon} {a.name}</option>)}
        </select>
        <select
          style={chip(cat.color)}
          value={draft.category || "Otros"}
          onChange={(e) => update({ category: e.target.value })}
        >
          {list.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: C.red, marginBottom: 12, fontWeight: 600 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...S.btnO, flex: "0 0 auto" }} onClick={onDiscard} disabled={busy}>✕ Descartar</button>
        <button style={{ ...S.btn(), flex: 1 }} onClick={onConfirm} disabled={busy}>
          {busy ? "Guardando…" : `✓ Guardar ${fmt(draft.amount)}`}
        </button>
      </div>
    </div>
  );
}
