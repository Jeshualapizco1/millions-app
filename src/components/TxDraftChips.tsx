import { useCategories } from "../lib/categories";
import { C, S } from "../lib/constants";
import { toLocalDateISO } from "../lib/dates";
import Money from "./Money";
import Icon from "./Icon";
import KindToggle from "./KindToggle";
import type { TxDraft } from "../hooks/useAI";
import type { Account } from "../types";

/** Edición explícita del borrador; hasta confirmar no se mueve dinero. */
export default function TxDraftChips({ draft, error, accs, busy, update, onConfirm, onDiscard }: {
  draft: TxDraft; error: string | null; accs: Account[]; busy: boolean; update: (patch: Partial<TxDraft>) => void; onConfirm: () => void; onDiscard: () => void;
}) {
  const { list } = useCategories();
  const account = accs.find((a) => a.name === draft.accountName);
  const valid = Number.isFinite(draft.amount) && draft.amount > 0 && draft.description.trim() && account;
  return <div>
    <h2 className="capture-title">¿Así quedó?</h2><div style={{ textAlign: "center", margin: "14px 0 22px" }}><Money value={draft.amount} size="hero" privateValue={false}/></div>
    <p className="hint" style={{ marginBottom: 20 }}>“{draft.dicho}”</p>
    <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
      <label htmlFor="draft-desc" style={S.lbl}>Descripción</label><input id="draft-desc" style={{ ...S.inp, marginBottom: 16 }} value={draft.description} onChange={(e) => update({ description: e.target.value })}/>
      <label htmlFor="draft-amount" style={S.lbl}>Monto</label><input id="draft-amount" type="number" min="0.01" step="0.01" inputMode="decimal" style={{ ...S.inp, marginBottom: 16 }} value={draft.amount || ""} onChange={(e) => update({ amount: Number(e.target.value) })}/>
      <KindToggle value={draft.type} onChange={(type) => update({ type })}/>
      <label htmlFor="draft-account" style={S.lbl}>Cuenta</label><select id="draft-account" style={{ ...S.inp, marginBottom: 16 }} value={draft.accountName || ""} onChange={(e) => update({ accountName: e.target.value })}><option value="">Elige una cuenta</option>{accs.map((a) => <option key={a.id} value={a.name}>{a.icon} {a.name}</option>)}</select>
      <label htmlFor="draft-category" style={S.lbl}>Categoría</label><select id="draft-category" style={{ ...S.inp, marginBottom: 16 }} value={draft.category || "Otros"} onChange={(e) => update({ category: e.target.value })}>{!list.some((c)=>c.name===draft.category) && <option value={draft.category || "Otros"}>{draft.category || "Otros"}</option>}{list.map((c)=><option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}</select>
      <label htmlFor="draft-date" style={S.lbl}>Fecha</label><input id="draft-date" type="date" style={{ ...S.inp, marginBottom: 16 }} max={toLocalDateISO()} value={draft.date || toLocalDateISO()} onChange={(e) => update({ date: e.target.value })}/>
    </fieldset>
    {account && valid && <p className="hint" style={{ padding: "12px 0" }}>{draft.type === "gasto" ? "Saldrá de" : "Entrará a"} tu cuenta {account.name}. Saldo después: <Money value={account.balance + (draft.type === "gasto" ? -draft.amount : draft.amount)} privateValue={false}/>.</p>}
    {error && <p role="alert" style={{ color: C.red, margin: "12px 0" }}>{error}</p>}
    <div style={{ display: "flex", gap: 10, marginTop: 14 }}><button style={S.btnO} onClick={onDiscard} disabled={busy}>Descartar</button><button style={{ ...S.btn(), flex: 1 }} onClick={onConfirm} disabled={busy || !valid}>{busy ? "Guardando…" : <><Icon name="check" size={18}/> Confirmar y guardar</>}</button></div>
  </div>;
}
