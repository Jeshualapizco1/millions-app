import Modal from "../components/Modal";
import KindToggle from "../components/KindToggle";
import { S, T } from "../lib/constants";
import { useCategories } from "../lib/categories";
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
  const { list } = useCategories();
  return (
    <Modal onClose={onClose} dirty={!!(form.desc || form.amt)} label="Entrada manual">
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>Entrada manual</div>
      <label style={S.lbl}>Descripción</label>
      <input autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder="Ej: Supermercado Ley" value={form.desc} onChange={(e) => update({ desc: e.target.value })} />
      <label style={S.lbl}>Monto</label>
      <input style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={form.amt} onChange={(e) => update({ amt: e.target.value })} />
      <label style={S.lbl}>Tipo</label>
      <KindToggle value={form.type} onChange={(t) => update({ type: t })} />
      <label style={S.lbl}>Categoría</label>
      <select style={{ ...S.inp, marginBottom: 14 }} value={form.cat} onChange={(e) => update({ cat: e.target.value })}>
        {list.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
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
