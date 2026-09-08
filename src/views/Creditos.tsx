import CreditCard from "../components/CreditCard";
import { C, S, T } from "../lib/constants";
import Money from "../components/Money";
import Icon from "../components/Icon";
import type { Credit } from "../types";

export default function Creditos({
  credits,
  totalDebt,
  onEdit,
  onAdd,
  onPay,
}: {
  credits: Credit[];
  totalDebt: number;
  onEdit: (c: Credit) => void;
  onAdd: () => void;
  onPay: (c: Credit) => void;
}) {
  return (
    <div className="fadeUp">
      <div className="section-head"><h2>Tarjetas y créditos</h2><button className="text-link" onClick={onAdd} aria-label="Añadir">Añadir <Icon name="mas" size={18}/></button></div>
      <div style={{ marginBottom: 26 }}><p className="hint">Deuda registrada</p><Money value={totalDebt} size="hero"/><p className="hint">{credits.length} créditos · La línea disponible no es dinero en tus cuentas.</p></div>
      {credits.map((c) => <CreditCard key={c.id} credit={c} onEdit={onEdit} onPay={onPay} />)}
      {credits.length === 0 && <div style={{ ...S.card, textAlign: "center", padding: 32 }}><div style={{ color: C.aLight, marginBottom: 12 }}><Icon name="creditos" size={36}/></div><div style={{ fontWeight: 700, marginBottom: 6 }}>Sin créditos</div><div style={{ fontSize: T.md, color: C.muted, marginBottom: 20 }}>Agrega tus tarjetas, hipoteca o crédito automotriz</div></div>}
      <button style={{ ...S.btn(), width: "100%" }} onClick={onAdd}><Icon name="mas" size={18}/> Agregar crédito</button>
    </div>
  );
}
