import { useState } from "react";
import Modal from "../components/Modal";
import { C, S } from "../lib/constants";
import { fmt } from "../lib/format";
import type { Account } from "../types";

/** Mover dinero entre cuentas propias: no cuenta como gasto ni ingreso. */
export default function TransferModal({
  accs,
  onSave,
  onClose,
}: {
  accs: Account[];
  onSave: (p: { fromId: string; toId: string; amount: number; description: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = accs.find((a) => a.id === fromId);
  const amount = parseFloat(amt);

  const save = async () => {
    if (!fromId || !toId) { setError("Elige cuenta de origen y destino"); return; }
    if (fromId === toId) { setError("Las cuentas deben ser distintas"); return; }
    if (!amount || amount <= 0) { setError("El monto debe ser mayor a cero"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave({ fromId, toId, amount, description: desc.trim() || "Transferencia" });
    } catch (e: any) {
      setError(e?.message || "No se pudo transferir");
      setLoading(false);
    }
  };

  const sel = { ...S.inp, marginBottom: 0 };
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>↔️ Transferir entre cuentas</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>No se registra como gasto ni como ingreso.</div>

      <label style={S.lbl}>Desde</label>
      <select autoFocus style={{ ...sel, marginBottom: 12 }} value={fromId} onChange={(e) => setFromId(e.target.value)}>
        <option value="">Selecciona la cuenta origen</option>
        {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name} — {fmt(a.balance)}</option>)}
      </select>

      <label style={S.lbl}>Hacia</label>
      <select style={{ ...sel, marginBottom: 12 }} value={toId} onChange={(e) => setToId(e.target.value)}>
        <option value="">Selecciona la cuenta destino</option>
        {accs.filter((a) => a.id !== fromId).map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name} — {fmt(a.balance)}</option>)}
      </select>

      <label style={S.lbl}>Monto</label>
      <input style={{ ...S.inp, marginBottom: 4 }} type="number" inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
      {from && amount > 0 && (
        <div style={{ fontSize: 11, color: amount > from.balance ? C.amber : C.muted, marginBottom: 12 }}>
          {from.name} quedaría en {fmt(from.balance - amount)}{amount > from.balance ? " (en negativo)" : ""}
        </div>
      )}
      {(!from || !(amount > 0)) && <div style={{ marginBottom: 12 }} />}

      <label style={S.lbl}>Concepto (opcional)</label>
      <input style={{ ...S.inp, marginBottom: 16 }} placeholder="Ej: Pago de renta" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />

      {error && <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Transferir"}</button>
      </div>
    </Modal>
  );
}
