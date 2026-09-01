import Modal from "../components/Modal";
import { ACC_ICONS, C, S } from "../lib/constants";
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
  onSave: () => void;
  /** Archiva o elimina según tenga o no movimientos; lo decide App. */
  onRemove?: () => void;
  onClose: () => void;
}) {
  const isNew = mode === "new";
  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{isNew ? "Nueva cuenta" : "Editar cuenta"}</div>
      <label style={S.lbl}>Nombre</label>
      <input autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder={isNew ? "Ej: BBVA, Revolut…" : undefined} value={form.name} onChange={(e) => update({ name: e.target.value })} />
      <label style={S.lbl}>{isNew ? "Saldo inicial" : "Saldo actual"}</label>
      <input style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder={isNew ? "0.00" : undefined} value={form.balance} onChange={(e) => update({ balance: e.target.value })} />
      {SELECTOR_DE_MONEDA_ACTIVO ? (
        <>
          <label style={S.lbl}>Moneda</label>
          <select style={{ ...S.inp, marginBottom: 14 }} value={form.currency ?? "MXN"} onChange={(e) => update({ currency: e.target.value })}>
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
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>{ACC_ICONS.map((ic) => <button key={ic} onClick={() => update({ icon: ic })} style={{ fontSize: 24, background: form.icon === ic ? C.accent + "33" : "transparent", border: `2px solid ${form.icon === ic ? C.accent : C.border + "44"}`, borderRadius: 10, padding: "6px 8px", cursor: "pointer" }}>{ic}</button>)}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {!isNew && onRemove && (
          <button onClick={onRemove} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Quitar</button>
        )}
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: isNew ? 1 : 2 }} onClick={onSave}>{isNew ? "Agregar" : "Guardar"}</button>
      </div>
    </Modal>
  );
}
