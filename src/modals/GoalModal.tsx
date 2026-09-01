import Modal from "../components/Modal";
import { C, R, S, T, GOAL_COLORS, GOAL_ICONS } from "../lib/constants";
import { fmt } from "../lib/format";
import type { Account, Goal } from "../types";

export interface GoalFormState {
  id?: string;
  name: string;
  target_amount: string | number;
  current_amount: string | number;
  target_date: string | null;
  icon: string;
  color: string;
  notes: string | null;
}

/** Nueva / editar meta de ahorro. */
export default function GoalModal({
  mode,
  form,
  update,
  onSave,
  onDelete,
  onClose,
}: {
  mode: "new" | "edit";
  form: GoalFormState;
  update: (patch: Partial<GoalFormState>) => void;
  onSave: () => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isNew = mode === "new";
  return (
    <Modal onClose={onClose} dirty={isNew && !!form.name} label={isNew ? "Nueva meta de ahorro" : "Editar meta"}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>{isNew ? "Nueva meta de ahorro" : "Editar meta"}</div>
      <label htmlFor="goalmodal-1" style={S.lbl}>Nombre</label>
      <input id="goalmodal-1" autoFocus style={{ ...S.inp, marginBottom: 12 }} placeholder={isNew ? "Ej: Viaje a Japón, Fondo de emergencia…" : undefined} value={form.name} onChange={(e) => update({ name: e.target.value })} />
      <label style={S.lbl}>Ícono</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{GOAL_ICONS.map((ic) => <button key={ic} onClick={() => update({ icon: ic })} style={{ fontSize: 22, background: form.icon === ic ? C.accent + "33" : "transparent", border: `2px solid ${form.icon === ic ? C.accent : C.border + "44"}`, borderRadius: R.sm, padding: "5px 8px", cursor: "pointer" }}>{ic}</button>)}</div>
      <label style={S.lbl}>Color</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{GOAL_COLORS.map((col) => <button key={col} onClick={() => update({ color: col })} style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: `3px solid ${form.color === col ? "#fff" : col + "44"}`, cursor: "pointer" }} />)}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 0 }}>
        <div style={{ flex: 1 }}><label htmlFor="goalmodal-2" style={S.lbl}>Meta ($)</label><input id="goalmodal-2" style={{ ...S.inp, marginBottom: 12 }} type="number" inputMode="decimal" placeholder={isNew ? "0.00" : undefined} value={form.target_amount} onChange={(e) => update({ target_amount: e.target.value })} /></div>
        <div style={{ flex: 1 }}><label htmlFor="goalmodal-3" style={S.lbl}>{isNew ? "Ya tengo ($)" : "Ahorrado ($)"}</label><input id="goalmodal-3" style={{ ...S.inp, marginBottom: 12 }} type="number" inputMode="decimal" placeholder={isNew ? "0.00" : undefined} value={form.current_amount} onChange={(e) => update({ current_amount: e.target.value })} /></div>
      </div>
      <label htmlFor="goalmodal-4" style={S.lbl}>{isNew ? "Fecha objetivo (opcional)" : "Fecha objetivo"}</label>
      <input id="goalmodal-4" style={{ ...S.inp, marginBottom: 12 }} type="date" value={form.target_date || ""} onChange={(e) => update({ target_date: e.target.value })} />
      <label htmlFor="goalmodal-5" style={S.lbl}>{isNew ? "Notas (opcional)" : "Notas"}</label>
      <input id="goalmodal-5" style={{ ...S.inp, marginBottom: 20 }} placeholder={isNew ? "Ej: Para diciembre de este año" : undefined} value={form.notes || ""} onChange={(e) => update({ notes: e.target.value })} />
      <div style={{ display: "flex", gap: 10 }}>
        {!isNew && onDelete && <button onClick={() => onDelete(form.id!)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: R.md, padding: "12px 14px", fontSize: T.base, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>}
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: isNew ? 1 : 2 }} onClick={onSave}>{isNew ? "Crear meta" : "Guardar"}</button>
      </div>
    </Modal>
  );
}

/**
 * Abonar a una meta. Si se elige cuenta origen, el dinero sale de verdad de
 * esa cuenta; sin cuenta es solo registro (ahorro que vive fuera de la app).
 */
export function AddToGoalModal({
  goal,
  accs,
  amount,
  onAmount,
  accountId,
  onAccount,
  onSave,
  onClose,
}: {
  goal: Goal;
  accs: Account[];
  amount: string;
  onAmount: (v: string) => void;
  accountId: string;
  onAccount: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const acc = accs.find((a) => a.id === accountId);
  const amt = parseFloat(amount);
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 8 }}>Abonar a meta</div>
      <div style={{ fontSize: T.base, color: C.muted, marginBottom: 16 }}>{goal.icon} {goal.name} — Ahorrado: {fmt(goal.current_amount)}</div>
      <label htmlFor="goalmodal-6" style={S.lbl}>¿Cuánto abonas?</label>
      <input id="goalmodal-6" autoFocus style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => onAmount(e.target.value)} />
      <label htmlFor="goalmodal-7" style={S.lbl}>¿De qué cuenta sale?</label>
      <select id="goalmodal-7" style={{ ...S.inp, marginBottom: 6 }} value={accountId} onChange={(e) => onAccount(e.target.value)}>
        <option value="">Solo registrarlo (no descuenta de ninguna cuenta)</option>
        {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name} — {fmt(a.balance)}</option>)}
      </select>
      <div style={{ fontSize: T.xs, color: C.muted, marginBottom: 20 }}>
        {acc && amt > 0
          ? `${acc.name} quedaría en ${fmt(acc.balance - amt)}`
          : "Sin cuenta, la meta sube pero ningún saldo baja."}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1 }} onClick={onSave}>Abonar</button>
      </div>
    </Modal>
  );
}
