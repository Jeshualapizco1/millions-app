import { useState, type CSSProperties } from "react";
import { C, CREDIT_TYPES } from "../lib/constants";
import type { CreditType } from "../types";

/** Estado del formulario: los campos numéricos pueden ser string (vacío) o number (al editar). */
export interface CreditFormState {
  id?: string;
  name: string;
  type: CreditType;
  institution: string | null;
  total_debt: string | number | null;
  credit_limit: string | number | null;
  monthly_payment: string | number | null;
  cut_day: string | number | null;
  payment_day: string | number | null;
  next_payment_date: string | null;
  interest_rate: string | number | null;
  notes: string | null;
}

const empty: CreditFormState = { name: "", type: "tarjeta", institution: "", total_debt: "", credit_limit: "", monthly_payment: "", cut_day: "", payment_day: "", next_payment_date: "", interest_rate: "", notes: "" };

export default function CreditForm({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: CreditFormState | null;
  onSave: (f: CreditFormState) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<CreditFormState>(initial || empty);
  const u = (k: keyof CreditFormState) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const s: Record<string, CSSProperties> = {
    inp: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 },
    lbl: { fontSize: 12, color: C.muted, marginBottom: 5, display: "block", fontWeight: 500 },
    row: { display: "flex", gap: 10 },
  };
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{initial ? "Editar crédito" : "Nuevo crédito"}</div>
      <label style={s.lbl}>Tipo</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {(Object.entries(CREDIT_TYPES) as [CreditType, (typeof CREDIT_TYPES)[CreditType]][]).map(([k, v]) => (
          <button key={k} onClick={() => setF((p) => ({ ...p, type: k }))} style={{ padding: "7px 12px", borderRadius: 20, border: `2px solid ${f.type === k ? v.color : C.border + "44"}`, background: f.type === k ? v.color + "22" : "transparent", color: f.type === k ? v.color : C.muted, fontSize: 13, cursor: "pointer", fontWeight: f.type === k ? 700 : 400 }}>{v.icon} {v.label}</button>
        ))}
      </div>
      <label style={s.lbl}>Nombre</label>
      <input style={s.inp} placeholder={`Ej: ${f.type === "tarjeta" ? "BBVA Azul" : f.type === "hipoteca" ? "Hipoteca casa" : "Mi crédito"}`} value={f.name} onChange={u("name")} autoFocus />
      <label style={s.lbl}>Institución</label>
      <input style={s.inp} placeholder="Ej: BBVA, Banregio…" value={f.institution ?? ""} onChange={u("institution")} />
      <label style={s.lbl}>Deuda actual</label>
      <input style={s.inp} type="number" inputMode="decimal" placeholder="0.00" value={f.total_debt ?? ""} onChange={u("total_debt")} />
      {f.type === "tarjeta" && <>
        <label style={s.lbl}>Límite</label>
        <input style={s.inp} type="number" inputMode="decimal" placeholder="0.00" value={f.credit_limit ?? ""} onChange={u("credit_limit")} />
        <div style={s.row}>
          <div style={{ flex: 1 }}><label style={s.lbl}>Día corte</label><input style={s.inp} type="number" inputMode="numeric" placeholder="15" min="1" max="31" value={f.cut_day ?? ""} onChange={u("cut_day")} /></div>
          <div style={{ flex: 1 }}><label style={s.lbl}>Día pago</label><input style={s.inp} type="number" inputMode="numeric" placeholder="10" min="1" max="31" value={f.payment_day ?? ""} onChange={u("payment_day")} /></div>
        </div>
      </>}
      {f.type !== "tarjeta" && <>
        <div style={s.row}>
          <div style={{ flex: 1 }}><label style={s.lbl}>Mensualidad</label><input style={s.inp} type="number" inputMode="decimal" placeholder="0.00" value={f.monthly_payment ?? ""} onChange={u("monthly_payment")} /></div>
          <div style={{ flex: 1 }}><label style={s.lbl}>Tasa anual %</label><input style={s.inp} type="number" inputMode="decimal" placeholder="10.5" value={f.interest_rate ?? ""} onChange={u("interest_rate")} /></div>
        </div>
        <label style={s.lbl}>Próximo pago</label>
        <input style={s.inp} type="date" value={f.next_payment_date || ""} onChange={u("next_payment_date")} />
      </>}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {initial && onDelete && <button onClick={() => onDelete(initial.id!)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 12, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>}
        <button onClick={onClose} style={{ flex: 1, background: "transparent", color: C.aLight, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => onSave(f)} style={{ flex: 2, background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{initial ? "Guardar" : "Agregar"}</button>
      </div>
    </div>
  );
}
