import Modal from "../components/Modal";
import { C, CATS, S } from "../lib/constants";

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
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Nuevo presupuesto</div>
      <label style={S.lbl}>Categoría</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {Object.entries(CATS).filter(([k]) => k !== "Ventas" && k !== "Nómina" && k !== "Transferencia").map(([k, v]) => (
          <button key={k} onClick={() => onCat(k)} style={{ padding: "7px 12px", borderRadius: 20, border: `2px solid ${budgetCat === k ? v.color : C.border + "44"}`, background: budgetCat === k ? v.color + "22" : "transparent", color: budgetCat === k ? v.color : C.muted, fontSize: 13, cursor: "pointer", fontWeight: budgetCat === k ? 700 : 400 }}>{v.icon} {k}</button>
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
