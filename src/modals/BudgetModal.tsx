import Modal from "../components/Modal";
import { C, S } from "../lib/constants";
import { useCategories } from "../lib/categories";

export default function BudgetModal({
  budgetCat,
  budgetAmt,
  onCat,
  onAmt,
  rollover,
  onRollover,
  onSave,
  onClose,
}: {
  budgetCat: string;
  budgetAmt: string;
  onCat: (cat: string) => void;
  onAmt: (amt: string) => void;
  rollover: boolean;
  onRollover: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { list } = useCategories();
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Nuevo presupuesto</div>
      <label style={S.lbl}>Categoría</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {list.filter((c) => c.kind !== "ingreso").map((c) => (
          <button key={c.id} onClick={() => onCat(c.name)} style={{ padding: "7px 12px", borderRadius: 20, border: `2px solid ${budgetCat === c.name ? c.color : C.border + "44"}`, background: budgetCat === c.name ? c.color + "22" : "transparent", color: budgetCat === c.name ? c.color : C.muted, fontSize: 13, cursor: "pointer", fontWeight: budgetCat === c.name ? 700 : 400 }}>{c.icon} {c.name}</button>
        ))}
      </div>
      <label style={S.lbl}>Límite mensual</label>
      <input autoFocus style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={budgetAmt} onChange={(e) => onAmt(e.target.value)} />

      <button
        onClick={() => onRollover(!rollover)}
        style={{ width: "100%", textAlign: "left", background: rollover ? C.accent + "18" : "transparent", border: `1px solid ${rollover ? C.accent + "66" : C.border}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", marginBottom: 20 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{rollover ? "☑️" : "⬜"}</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Arrastrar lo que sobre</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Si un mes gastas menos, el resto se suma al siguiente (solo un mes).</div>
          </div>
        </div>
      </button>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1 }} onClick={onSave}>Guardar</button>
      </div>
    </Modal>
  );
}
