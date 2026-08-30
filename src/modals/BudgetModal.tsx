import Modal from "../components/Modal";
import { C, S } from "../lib/constants";
import { useCategories } from "../lib/categories";

export default function BudgetModal({
  budgetCat,
  budgetAmt,
  onCat,
  onAmt,
  onSave,
  onClose,
}: {
  budgetCat: string;
  budgetAmt: string;
  onCat: (cat: string) => void;
  onAmt: (amt: string) => void;
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
      <input autoFocus style={{ ...S.inp, marginBottom: 20 }} type="number" inputMode="decimal" placeholder="0.00" value={budgetAmt} onChange={(e) => onAmt(e.target.value)} />
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1 }} onClick={onSave}>Guardar</button>
      </div>
    </Modal>
  );
}
