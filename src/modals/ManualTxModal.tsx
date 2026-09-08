import { useRef, useState } from "react";
import TxDraftChips from "../components/TxDraftChips";
import ErrorBox from "../components/ErrorBox";
import { captureDateISO, toLocalDateISO } from "../lib/dates";
import Modal from "../components/Modal";
import KindToggle from "../components/KindToggle";
import { S, T } from "../lib/constants";
import { useCategories } from "../lib/categories";
import type { Account, TxType } from "../types";

export interface ManualTxFormState {
  date?: string;
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
  onSave: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { list } = useCategories();
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const validate = () => {
    if (!form.desc.trim()) return "Escribe una descripción";
    if (!(Number(form.amt) > 0) || !Number.isFinite(Number(form.amt))) return "El monto debe ser mayor a cero";
    if (!accs.some((a) => a.id === form.aid)) return "Elige una cuenta";
    try { captureDateISO(form.date || toLocalDateISO()); } catch(e) { return (e as Error).message; }
    return "";
  };
  const save = async () => {
    if (lock.current) return;
    const message = validate(); if (message) { setError(message); return; }
    lock.current = true; setBusy(true); setError("");
    try { await onSave(); } catch(e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { lock.current = false; setBusy(false); }
  };
  if (review) return <Modal onClose={onClose} dirty busy={busy} label="Revisar movimiento manual"><TxDraftChips
    draft={{ description: form.desc, amount: Number(form.amt), type: form.type, category: form.cat, accountName: accs.find((a)=>a.id===form.aid)?.name || "", dicho: "Registro manual", date: form.date || toLocalDateISO() }}
    error={error || null} busy={busy} accs={accs}
    update={(p) => { setError(""); update({ ...(p.description !== undefined ? { desc:p.description } : {}), ...(p.amount !== undefined ? { amt:String(p.amount) } : {}), ...(p.type ? { type:p.type } : {}), ...(p.category ? { cat:p.category } : {}), ...(p.accountName !== undefined ? { aid:accs.find((a)=>a.name===p.accountName)?.id || "" } : {}), ...(p.date !== undefined ? { date:p.date } : {}) }); }}
    onConfirm={() => void save()} onDiscard={onClose}/></Modal>;
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
      <label htmlFor="manual-date" style={S.lbl}>Fecha</label><input id="manual-date" type="date" max={toLocalDateISO()} value={form.date || toLocalDateISO()} onChange={(e) => update({date:e.target.value})} style={{ ...S.inp, marginBottom: 20 }}/>{error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1 }} onClick={() => { const message=validate(); setError(message); if(!message) setReview(true); }}>Revisar</button>
      </div>
    </Modal>
  );
}
