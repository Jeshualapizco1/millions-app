import { useState } from "react";
import KindToggle from "../components/KindToggle";
import ErrorBox from "../components/ErrorBox";
import { toLocalDateISO } from "../lib/dates";
import Modal from "../components/Modal";
import { S, T } from "../lib/constants";
import { useCategories } from "../lib/categories";
import type { Account, Transaction, TxType } from "../types";

/**
 * Editar un gasto o ingreso. La RPC revierte el efecto viejo y aplica el
 * nuevo en una sola transacción de Postgres, así que cambiar monto o cuenta
 * reajusta los saldos sin pasos intermedios.
 */
export default function EditTxModal({
  tx,
  accs,
  onSave,
  onClose,
}: {
  tx: Transaction;
  accs: Account[];
  onSave: (p: { id: string; accountId: string; kind: TxType; amount: number; description: string; category: string; date: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [desc, setDesc] = useState(tx.description);
  const [amt, setAmt] = useState(String(tx.amount));
  const [type, setType] = useState<TxType>(tx.type);
  const [aid, setAid] = useState(tx.accountId);
  const [cat, setCat] = useState(tx.category);
  // Día LOCAL del movimiento: con toISOString, de tarde, el campo abría en
  // "mañana" y se guardaba así aunque no se tocara.
  const [date, setDate] = useState(toLocalDateISO(tx.date));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { list } = useCategories();

  const save = async () => {
    const amount = parseFloat(amt);
    if (!desc.trim()) { setError("Escribe una descripción"); return; }
    if (!amount || amount <= 0) { setError("El monto debe ser mayor a cero"); return; }
    if (!aid) { setError("Elige una cuenta"); return; }
    setLoading(true);
    setError("");
    try {
      // Conserva la hora original y solo cambia el día si el usuario lo movió
      const original = new Date(tx.date);
      const [y, m, d] = date.split("-").map(Number);
      const when = new Date(y, m - 1, d, original.getHours(), original.getMinutes(), original.getSeconds());
      await onSave({ id: tx.id, accountId: aid, kind: type, amount, description: desc.trim(), category: cat, date: when.toISOString() });
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar");
      setLoading(false);
    }
  };

  const conCambios =
    desc !== tx.description || amt !== String(tx.amount) || type !== tx.type || aid !== tx.accountId || cat !== tx.category || date !== toLocalDateISO(tx.date);

  return (
    <Modal onClose={onClose} dirty={conCambios} label="Editar movimiento">
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>Editar movimiento</div>
      <label style={S.lbl}>Descripción</label>
      <input autoFocus style={{ ...S.inp, marginBottom: 14 }} value={desc} onChange={(e) => setDesc(e.target.value)} />
      <label style={S.lbl}>Monto</label>
      <input style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <label style={S.lbl}>Tipo</label>
      <KindToggle value={type} onChange={(t) => setType(t)} />
      <label style={S.lbl}>Categoría</label>
      <select style={{ ...S.inp, marginBottom: 14 }} value={cat} onChange={(e) => setCat(e.target.value)}>
        {list.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
      </select>
      <label style={S.lbl}>Cuenta</label>
      <select style={{ ...S.inp, marginBottom: 14 }} value={aid} onChange={(e) => setAid(e.target.value)}>
        {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
      </select>
      <label style={S.lbl}>Fecha</label>
      <input style={{ ...S.inp, marginBottom: 20 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Guardar"}</button>
      </div>
    </Modal>
  );
}
