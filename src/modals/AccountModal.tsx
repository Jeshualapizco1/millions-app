import { useRef, useState } from "react";
import ErrorBox from "../components/ErrorBox";
import Modal from "../components/Modal";
import { C, R, S, T, ACC_ICONS } from "../lib/constants";
import { CURRENCIES, CURRENCY_LABEL, SELECTOR_DE_MONEDA_ACTIVO } from "../lib/currency";

export interface AccountFormState {
  name: string;
  balance: string | number;
  icon: string;
  currency?: string;
}

/** Nueva / editar cuenta — mismo markup que los dos modales del monolito. */
export default function AccountModal({
  mode,
  form,
  update,
  onSave,
  onRemove,
  onClose,
}: {
  mode: "new" | "edit";
  form: AccountFormState;
  update: (patch: Partial<AccountFormState>) => void;
  onSave: () => Promise<void>;
  /** Archiva o elimina según tenga o no movimientos; lo decide App. */
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const save = async () => {
    if (lock.current) return;
    if (!form.name.trim()) { setError("Ponle un nombre a la cuenta"); return; }
    if (!Number.isFinite(Number(form.balance))) { setError("Revisa el saldo"); return; }
    lock.current = true; setBusy(true); setError("");
    try { await onSave(); } catch(e) { setError(e instanceof Error ? e.message : "No se pudo guardar la cuenta"); }
    finally { lock.current = false; setBusy(false); }
  };
  const isNew = mode === "new";
  return (
    <Modal onClose={onClose} dirty={!!form.name || !!form.balance} busy={busy} label={isNew ? "Nueva cuenta" : "Editar cuenta"}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 16 }}>{isNew ? "Nueva cuenta" : "Editar cuenta"}</div>
      <p style={{ color: C.muted, fontSize: T.md, marginBottom: 16 }}>Efectivo o cuenta de débito. Las tarjetas de crédito se añaden en Mi dinero → Créditos.</p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
      <label htmlFor="accountmodal-1" style={S.lbl}>Nombre</label>
      <input id="accountmodal-1" autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder={isNew ? "Ej: BBVA, Revolut…" : undefined} value={form.name} onChange={(e) => update({ name: e.target.value })} />
      <label htmlFor="accountmodal-2" style={S.lbl}>{isNew ? "Saldo inicial" : "Saldo actual"}</label>
      <input id="accountmodal-2" style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder={isNew ? "0.00" : undefined} value={form.balance} onChange={(e) => update({ balance: e.target.value })} />
      {SELECTOR_DE_MONEDA_ACTIVO ? (
        <>
          <label htmlFor="accountmodal-3" style={S.lbl}>Moneda</label>
          <select id="accountmodal-3" style={{ ...S.inp, marginBottom: 14 }} value={form.currency ?? "MXN"} onChange={(e) => update({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {CURRENCY_LABEL[c]}</option>)}
          </select>
        </>
      ) : (
        // Con el selector apagado, una cuenta que ya venía en otra moneda la
        // muestra sin poder cambiarla: esconder el dato confundiría más que el
        // candado. Las cuentas nuevas nacen en pesos.
        form.currency && form.currency !== "MXN" && (
          <>
            <label style={S.lbl}>Moneda</label>
            <div style={{ ...S.inp, marginBottom: 14, color: C.muted }}>
              {form.currency} — {CURRENCY_LABEL[form.currency] ?? form.currency}
            </div>
          </>
        )
      )}

      <label style={S.lbl}>Ícono</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>{ACC_ICONS.map((ic) => <button key={ic} onClick={() => update({ icon: ic })} style={{ fontSize: T.hero, background: form.icon === ic ? C.accent + "33" : "transparent", border: `2px solid ${form.icon === ic ? C.accent : C.border + "44"}`, borderRadius: R.sm, padding: "6px 8px", cursor: "pointer" }}>{ic}</button>)}</div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        {!isNew && onRemove && (
          <button onClick={onRemove} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: R.md, padding: "12px 14px", fontSize: T.base, fontWeight: 600, cursor: "pointer" }}>Quitar</button>
        )}
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: isNew ? 1 : 2 }} onClick={() => void save()}>{busy ? "Guardando…" : isNew ? "Agregar cuenta" : "Guardar"}</button>
      </div>
      </fieldset>
    </Modal>
  );
}
