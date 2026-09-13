import Modal from "./Modal";
import ErrorBox from "./ErrorBox";
import { useRef, useState, type CSSProperties } from "react";
import { C, R, S, T, CREDIT_TYPES } from "../lib/constants";
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
  onSave: (f: CreditFormState) => Promise<void>;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<CreditFormState>(initial || empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const save = async () => {
    if (lock.current) return;
    if (!f.name.trim()) { setError("Ponle un nombre al crédito"); return; }
    for (const key of ["total_debt", "credit_limit", "monthly_payment", "interest_rate"] as const) {
      if (f[key] !== null && f[key] !== "" && (!Number.isFinite(Number(f[key])) || Number(f[key]) < 0)) { setError("Los importes y la tasa deben ser números válidos, sin signo negativo"); return; }
    }
    for (const key of ["cut_day", "payment_day"] as const) {
      if (f[key] !== null && f[key] !== "" && (!Number.isInteger(Number(f[key])) || Number(f[key]) < 1 || Number(f[key]) > 31)) { setError("Los días de corte y pago deben estar entre 1 y 31"); return; }
    }
    lock.current = true; setBusy(true); setError("");
    try { await onSave({ ...f, name: f.name.trim() }); }
    catch(e) { setError(e instanceof Error ? e.message : "No se pudo guardar el crédito"); }
    finally { lock.current = false; setBusy(false); }
  };
  const u = (k: keyof CreditFormState) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  /**
   * Al cambiar de tipo se limpian los campos que no pertenecen al nuevo:
   * antes una hipoteca podía guardarse con el día de corte de una tarjeta.
   */
  const changeType = (k: CreditType) =>
    setF((p) => ({
      ...p,
      type: k,
      ...(k === "tarjeta"
        ? { monthly_payment: "", interest_rate: "", next_payment_date: "" }
        : { credit_limit: "", cut_day: "", payment_day: "" }),
    }));
  const s: Record<string, CSSProperties> = {
    inp: { ...S.inp, padding: "11px 14px", marginBottom: 12 },
    lbl: S.lbl,
    row: { display: "flex", gap: 10 },
  };
  return (
    <Modal onClose={onClose} dirty={JSON.stringify(f) !== JSON.stringify(initial || empty)} busy={busy} label={initial ? "Editar crédito" : "Nuevo crédito"}>
    <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>{initial ? "Editar crédito" : "Nuevo crédito"}</div>
      <label style={s.lbl}>Tipo</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {(Object.entries(CREDIT_TYPES) as [CreditType, (typeof CREDIT_TYPES)[CreditType]][]).map(([k, v]) => (
          <button key={k} aria-pressed={f.type === k} onClick={() => changeType(k)} style={{ padding: "7px 12px", borderRadius: R.lg, border: `2px solid ${f.type === k ? v.color : C.border + "44"}`, background: f.type === k ? v.color + "22" : "transparent", color: f.type === k ? v.color : C.muted, fontSize: T.md, cursor: "pointer", fontWeight: f.type === k ? 700 : 400 }}>{v.icon} {v.label}</button>
        ))}
      </div>
      <label htmlFor="credit-name" style={s.lbl}>Nombre</label>
      <input id="credit-name" style={s.inp} placeholder={`Ej: ${f.type === "tarjeta" ? "BBVA Azul" : f.type === "hipoteca" ? "Hipoteca casa" : "Mi crédito"}`} value={f.name} onChange={u("name")} autoFocus />
      <label htmlFor="credit-institution" style={s.lbl}>Institución</label>
      <input id="credit-institution" style={s.inp} placeholder="Ej: BBVA, Banregio…" value={f.institution ?? ""} onChange={u("institution")} />
      <label htmlFor="credit-total_debt" style={s.lbl}>Deuda actual</label>
      <input id="credit-total_debt" style={s.inp} type="number" inputMode="decimal" placeholder="0.00" value={f.total_debt ?? ""} onChange={u("total_debt")} />
      {f.type === "tarjeta" && <>
        <label htmlFor="credit-credit_limit" style={s.lbl}>Límite</label>
        <input id="credit-credit_limit" style={s.inp} type="number" inputMode="decimal" placeholder="0.00" value={f.credit_limit ?? ""} onChange={u("credit_limit")} />
        <div style={s.row}>
          <div style={{ flex: 1 }}><label htmlFor="credit-cut_day" style={s.lbl}>Día corte</label><input id="credit-cut_day" style={s.inp} type="number" inputMode="numeric" placeholder="15" min="1" max="31" value={f.cut_day ?? ""} onChange={u("cut_day")} /></div>
          <div style={{ flex: 1 }}><label htmlFor="credit-payment_day" style={s.lbl}>Día pago</label><input id="credit-payment_day" style={s.inp} type="number" inputMode="numeric" placeholder="10" min="1" max="31" value={f.payment_day ?? ""} onChange={u("payment_day")} /></div>
        </div>
      </>}
      {f.type !== "tarjeta" && <>
        <div style={s.row}>
          <div style={{ flex: 1 }}><label htmlFor="credit-monthly_payment" style={s.lbl}>Mensualidad</label><input id="credit-monthly_payment" style={s.inp} type="number" inputMode="decimal" placeholder="0.00" value={f.monthly_payment ?? ""} onChange={u("monthly_payment")} /></div>
          <div style={{ flex: 1 }}><label htmlFor="credit-interest_rate" style={s.lbl}>Tasa anual %</label><input id="credit-interest_rate" style={s.inp} type="number" inputMode="decimal" placeholder="10.5" value={f.interest_rate ?? ""} onChange={u("interest_rate")} /></div>
        </div>
        <label htmlFor="credit-next_payment_date" style={s.lbl}>Próximo pago</label>
        <input id="credit-next_payment_date" style={s.inp} type="date" value={f.next_payment_date || ""} onChange={u("next_payment_date")} />
      </>}
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {initial && onDelete && <button onClick={() => onDelete(initial.id!)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: R.md, padding: "12px 16px", fontSize: T.base, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>}
        <button onClick={onClose} style={{ flex: 1, background: "transparent", color: C.aLight, border: `1px solid ${C.accent}44`, borderRadius: R.md, padding: "12px", fontSize: T.base, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => void save()} style={{ flex: 2, background: C.accent, color: "#fff", border: "none", borderRadius: R.md, padding: "12px", fontSize: T.base, fontWeight: 700, cursor: "pointer" }}>{busy ? "Guardando…" : initial ? "Guardar" : "Agregar crédito"}</button>
      </div>
    </fieldset>
    </Modal>
  );
}
