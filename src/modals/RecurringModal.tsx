import { useState } from "react";
import KindToggle from "../components/KindToggle";
import ErrorBox from "../components/ErrorBox";
import { toLocalDateISO } from "../lib/dates";
import Modal from "../components/Modal";
import { C, R, S, T } from "../lib/constants";
import { useCategories } from "../lib/categories";
import type { Account, RecurringFrequency, RecurringRule, TxType } from "../types";

const FREQS: { key: RecurringFrequency; label: string }[] = [
  { key: "semanal", label: "Cada semana" },
  { key: "quincenal", label: "Cada 15 días" },
  { key: "mensual", label: "Cada mes" },
  { key: "anual", label: "Cada año" },
];

const hoy = () => toLocalDateISO();

/** Alta y edición de un movimiento fijo (renta, suscripción, nómina). */
export default function RecurringModal({
  rule,
  accs,
  onSave,
  onDelete,
  onClose,
}: {
  rule: RecurringRule | null;
  accs: Account[];
  onSave: (p: { id?: string; name: string; kind: TxType; amount: number; accountId: string; category: string; frequency: RecurringFrequency; next_run: string }) => Promise<void>;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [kind, setKind] = useState<TxType>(rule?.kind ?? "gasto");
  const [amt, setAmt] = useState(rule ? String(rule.amount) : "");
  const [accountId, setAccountId] = useState(rule?.accountId ?? "");
  const [cat, setCat] = useState(rule?.category ?? "Servicios");
  const [frequency, setFrequency] = useState<RecurringFrequency>(rule?.frequency ?? "mensual");
  const [nextRun, setNextRun] = useState(rule?.next_run ?? hoy());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { list } = useCategories();

  const save = async () => {
    const amount = parseFloat(amt);
    if (!name.trim()) { setError("Ponle un nombre (ej: Renta, Netflix)"); return; }
    if (!amount || amount <= 0) { setError("El monto debe ser mayor a cero"); return; }
    if (!accountId) { setError("Elige la cuenta afectada"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave({ id: rule?.id, name: name.trim(), kind, amount, accountId, category: cat, frequency, next_run: nextRun });
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar");
      setLoading(false);
    }
  };

  const conCambios = rule
    ? name !== rule.name || amt !== String(rule.amount) || kind !== rule.kind || accountId !== rule.accountId || cat !== rule.category || frequency !== rule.frequency || nextRun !== rule.next_run
    : !!(name || amt);

  return (
    <Modal onClose={onClose} dirty={conCambios} label={rule ? "Editar movimiento fijo" : "Nuevo movimiento fijo"}>
      <div style={{ fontWeight: 800, fontSize: T.xl, marginBottom: 4 }}>{rule ? "Editar movimiento fijo" : "Nuevo movimiento fijo"}</div>
      <div style={{ fontSize: T.sm, color: C.muted, marginBottom: 16 }}>Se registra solo en la fecha que indiques, sin que tengas que capturarlo.</div>

      <label htmlFor="recurringmodal-1" style={S.lbl}>Nombre</label>
      <input id="recurringmodal-1" autoFocus style={{ ...S.inp, marginBottom: 14 }} placeholder="Ej: Renta, Netflix, Nómina" value={name} onChange={(e) => setName(e.target.value)} />

      <label style={S.lbl}>Tipo</label>
      <KindToggle value={kind} onChange={(t) => setKind(t)} />

      <label htmlFor="recurringmodal-2" style={S.lbl}>Monto</label>
      <input id="recurringmodal-2" style={{ ...S.inp, marginBottom: 14 }} type="number" inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />

      <label style={S.lbl}>Cada cuánto</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {FREQS.map((f) => (
          <button key={f.key} onClick={() => setFrequency(f.key)} style={{ padding: "7px 12px", borderRadius: R.pill, border: `2px solid ${frequency === f.key ? C.accent : C.border + "44"}`, background: frequency === f.key ? C.accent + "22" : "transparent", color: frequency === f.key ? C.aLight : C.muted, fontSize: T.md, cursor: "pointer", fontWeight: frequency === f.key ? 700 : 400 }}>
            {f.label}
          </button>
        ))}
      </div>

      <label htmlFor="recurringmodal-3" style={S.lbl}>Categoría</label>
      <select id="recurringmodal-3" style={{ ...S.inp, marginBottom: 14 }} value={cat} onChange={(e) => setCat(e.target.value)}>
        {list.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
      </select>

      <label htmlFor="recurringmodal-4" style={S.lbl}>Cuenta</label>
      <select id="recurringmodal-4" style={{ ...S.inp, marginBottom: 14 }} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Selecciona una cuenta</option>
        {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
      </select>

      <label htmlFor="recurringmodal-5" style={S.lbl}>{rule ? "Próxima vez" : "Primera vez"}</label>
      <input id="recurringmodal-5" style={{ ...S.inp, marginBottom: 6 }} type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} />
      <div style={{ fontSize: T.xs, color: C.muted, marginBottom: 20 }}>
        Si eliges una fecha pasada, se generarán las que falten la próxima vez que corra.
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: "flex", gap: 10 }}>
        {rule && onDelete && <button onClick={() => onDelete(rule.id)} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: R.md, padding: "12px 14px", fontSize: T.base, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>}
        <button style={{ ...S.btnO, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btn(), flex: rule ? 2 : 1, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={save}>{loading ? "..." : "Guardar"}</button>
      </div>
    </Modal>
  );
}
