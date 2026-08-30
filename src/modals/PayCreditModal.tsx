import { useState } from "react";
import Modal from "../components/Modal";
import { C, S } from "../lib/constants";
import { fmt } from "../lib/format";
import type { Account, Credit } from "../types";

/**
 * Pagar un crédito en un solo paso: baja el saldo de la cuenta, baja la deuda
 * y deja el pago en el historial. Antes había que capturar el gasto y editar
 * la deuda a mano, en dos lugares.
 */
export default function PayCreditModal({
  credit,
  accs,
  onSave,
  onClose,
}: {
  credit: Credit;
  accs: Account[];
  onSave: (p: { creditId: string; accountId: string; amount: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [amt, setAmt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const debt = Number(credit.total_debt) || 0;
  const monthly = Number(credit.monthly_payment) || 0;
  const acc = accs.find((a) => a.id === accountId);
  const amount = parseFloat(amt);

  const save = async () => {
    if (!accountId) { setError("Elige de qué cuenta sale el pago"); return; }
    if (!amount || amount <= 0) { setError("El monto debe ser mayor a cero"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave({ creditId: credit.id, accountId, amount });
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar el pago");
      setLoading(false);
    }
  };

  const chip = (label: string, value: number) => (
    <button
      key={label}
      onClick={() => setAmt(String(value))}
      style={{ background: C.accent + "1a", border: `1px solid ${C.accent}44`, color: C.aLight, borderRadius: 999, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
    >
      {label} · {fmt(value)}
    </button>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Pagar {credit.name}</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Deuda actual: {fmt(debt)}</div>

      <label style={S.lbl}>Desde qué cuenta</label>
      <select autoFocus style={{ ...S.inp, marginBottom: 12 }} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Selecciona una cuenta</option>
        {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name} — {fmt(a.balance)}</option>)}
      </select>

      <label style={S.lbl}>Monto</label>
      <input style={{ ...S.inp, marginBottom: 8 }} type="number" inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {monthly > 0 && chip("Mensualidad", monthly)}
        {debt > 0 && chip("Todo", debt)}
      </div>
      {acc && amount > 0 && (
        <div style={{ fontSize: 11, color: amount > acc.balance ? C.amber : C.muted, marginBottom: 16 }}>
          {acc.name} quedaría en {fmt(acc.balance - amount)} · deuda en {fmt(Math.max(debt - amount, 0))}
          {amount > acc.balance ? " (cuenta en negativo)" : ""}
        </div>
      )}
      {!(acc && amount > 0) && <div style={{ marginBottom: 16 }} />}

      {error && <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Registrar pago"}</button>
      </div>
    </Modal>
  );
}
