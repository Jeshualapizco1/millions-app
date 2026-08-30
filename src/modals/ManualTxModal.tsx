import Modal from "../components/Modal";
import { C, CATS, S } from "../lib/constants";
import type { Account, TxType } from "../types";

export interface ManualTxFormState {
  desc: string;
  amt: string;
  type: TxType;
  aid: string;
  cat: string;
}

export default function ManualTxModal({
  form,
  update,
  accs,
  onSave,
  onClose,
}: {
  form: ManualTxFormState;
  update: (patch: Partial<ManualTxFormState>) => void;
  accs: Account[];
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Entrada manual</div>
      <label style={S.lbl}>Descripción</label>
      <input autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder="Ej: Supermercado Ley" value={form.desc} onChange={(e) => update({ desc: e.target.value })} />
      <label style={S.lbl}>Monto</label>
      <input style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={form.amt} onChange={(e) => update({ amt: e.target.value })} />
      <label style={S.lbl}>Tipo</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["gasto", "ingreso"] as const).map((t) => (
          <button key={t} onClick={() => update({ type: t })} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${form.type === t ? (t === "gasto" ? C.red : C.green) : C.border + "44"}`, background: form.type === t ? (t === "gasto" ? C.red : C.green) + "22" : "transparent", color: form.type === t ? (t === "gasto" ? C.red : C.green) : C.muted, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            {t === "gasto" ? "🔴 Gasto" : "🟢 Ingreso"}
          </button>
        ))}
      </div>
      <label style={S.lbl}>Categoría</label>
      <select style={{ ...S.inp, marginBottom: 14 }} value={form.cat} onChange={(e) => update({ cat: e.target.value })}>
        {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
      </select>
      <label style={S.lbl}>Cuenta</label>
      <select style={{ ...S.inp, marginBottom: 20 }} value={form.aid} onChange={(e) => update({ aid: e.target.value })}>
        <option value="">Selecciona una cuenta</option>
        {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
      </select>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1 }} onClick={onSave}>Guardar</button>
      </div>
    </Modal>
  );
}
