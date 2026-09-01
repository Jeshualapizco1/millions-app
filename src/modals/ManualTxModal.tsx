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
      <label htmlFor="manualtxmodal-1" style={S.lbl}>Descripción</label>
      <input id="manualtxmodal-1" autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder="Ej: Supermercado Ley" value={form.desc} onChange={(e) => update({ desc: e.target.value })} />
      <label htmlFor="manualtxmodal-2" style={S.lbl}>Monto</label>
      <input id="manualtxmodal-2" style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={form.amt} onChange={(e) => update({ amt: e.target.value })} />
      <label style={S.lbl}>Tipo</label>
      <KindToggle value={form.type} onChange={(t) => update({ type: t })} />
      <label htmlFor="manualtxmodal-3" style={S.lbl}>Categoría</label>
      <select id="manualtxmodal-3" style={{ ...S.inp, marginBottom: 14 }} value={form.cat} onChange={(e) => update({ cat: e.target.value })}>
        {list.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
      </select>
      <label htmlFor="manualtxmodal-4" style={S.lbl}>Cuenta</label>
      <select id="manualtxmodal-4" style={{ ...S.inp, marginBottom: 20 }} value={form.aid} onChange={(e) => update({ aid: e.target.value })}>
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
