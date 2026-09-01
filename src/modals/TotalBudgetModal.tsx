import { useState } from "react";
import ErrorBox from "../components/ErrorBox";
import Modal from "../components/Modal";
import { C, R, S, T } from "../lib/constants";
import { fmt } from "../lib/format";

/** Techo de gasto para todo el mes, además de los límites por categoría. */
export default function TotalBudgetModal({
  current,
  spentThisMonth,
  onSave,
  onClose,
}: {
  current: number | null;
  spentThisMonth: number;
  onSave: (amount: number | null) => Promise<void>;
  onClose: () => void;
}) {
  const [amt, setAmt] = useState(current ? String(current) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const guardar = async (value: number | null) => {
    setLoading(true);
    setError("");
    try {
      await onSave(value);
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar");
      setLoading(false);
    }
  };

  const save = () => {
    const n = parseFloat(amt);
    if (!n || n <= 0) { setError("Escribe un monto mayor a cero"); return; }
    guardar(n);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 4 }}>Techo de gasto mensual</div>
      <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 16 }}>
        Un límite para todo el mes, sin importar la categoría. Sirve para saber si vas a cerrar bien mucho antes de que acabe.
      </div>

      <label htmlFor="totalbudgetmodal-1" style={S.lbl}>Monto</label>
      <input id="totalbudgetmodal-1" autoFocus style={{ ...S.inp, marginBottom: 8 }} type="number" inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
      <div style={{ fontSize: T.xs, color: C.muted, marginBottom: 20 }}>
        Este mes llevas gastado {fmt(spentThisMonth)}.
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        {current !== null && (
          <button onClick={() => guardar(null)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: R.md, padding: "12px 14px", fontSize: T.base, fontWeight: 600, cursor: "pointer" }}>Quitar</button>
        )}
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: current !== null ? 2 : 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Guardar"}</button>
      </div>
    </Modal>
  );
}
