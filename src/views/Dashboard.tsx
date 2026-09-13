import Icon from "../components/Icon";
import TxRow from "../components/TxRow";
import Money, { PrivacyButton } from "../components/Money";
import { S } from "../lib/constants";
import { dueLabel, homeAttention } from "../lib/presentation";
import type { Proximo } from "../lib/upcoming";
import type { TotalBudget } from "../lib/budgets";
import type { Transaction } from "../types";

export default function Dashboard({ balance, hasAccounts, txs, income, spend, upcoming, budget, onAccounts, onNewAccount, onCredit, onPlans, onAnalysis, onHistory, onCapture, onEditTx }: {
  balance: number; hasAccounts: boolean; txs: Transaction[]; income: number; spend: number; upcoming: Proximo[]; budget: TotalBudget | null;
  onAccounts: () => void; onNewAccount: () => void; onCredit: () => void; onPlans: (section: "presupuestos" | "fijos") => void; onAnalysis: () => void; onHistory: () => void; onCapture: () => void; onEditTx: (t: Transaction) => void;
}) {
  const attention = homeAttention(balance, upcoming, budget);
  return <div className="fadeUp">
    <div className="balance-stack"><section className="balance-hero" aria-label="Saldo de tus cuentas">
      <div className="section-head" style={{ marginBottom: 0 }}><span className="muted">En tus cuentas</span><PrivacyButton /></div>
      {hasAccounts ? <Money value={balance} size="hero" /> : <div className="display" style={{ fontSize: 38, margin: "12px 0" }}>Por añadir</div>}
      <p className="hint">{hasAccounts ? "Saldo registrado · No incluye líneas de crédito" : "Empieza con efectivo o con tu cuenta de débito."}</p>
      <button className="text-link" onClick={hasAccounts ? onAccounts : onNewAccount}>{hasAccounts ? "Ver cuentas" : "Añadir mi primera cuenta"}<Icon name="flecha" size={17}/></button>
    </section></div>
    {hasAccounts && <>
      {attention.kind === "balance" ? <button className="attention" onClick={onAccounts}><Icon name="cuentas"/><div className="attention-copy"><strong>Revisa tus saldos</strong><p>El total registrado está por debajo de cero.</p></div><Icon name="flecha" size={18}/></button>
      : attention.kind === "upcoming" ? <button className="attention" onClick={attention.next.tipo === "fijo" ? () => onPlans("fijos") : onCredit}><Icon name={attention.next.tipo === "fijo" ? "repetir" : "creditos"}/><div className="attention-copy"><strong>{attention.next.name}</strong><p>{dueLabel(attention.next.dias)}{attention.next.tipo === "fijo" ? " · Registro automático" : ""}</p></div>{attention.next.amount > 0 ? <Money value={attention.next.amount}/> : <span>{attention.next.tipo === "corte" ? "Corte" : "Revisar importe"}</span>}</button>
      : attention.kind === "budget" ? <button className="attention attention-quiet" onClick={() => onPlans("presupuestos")}><div className="attention-copy"><strong>{attention.remaining >= 0 ? "Queda en tu presupuesto" : "Por encima del presupuesto"}</strong><p>Gasto registrado de este mes</p></div><Money value={Math.abs(attention.remaining)}/><Icon name="flecha" size={18}/></button>
      : <button className="attention attention-quiet" onClick={() => onPlans("presupuestos")}><span className="hint">{attention.next ? `${attention.next.name} · ${dueLabel(attention.next.dias)}` : "Sin próximos pagos registrados"}</span><Icon name="flecha" size={18}/></button>}
    </>}
    {!hasAccounts && <p className="hint" style={{ marginBottom: 24 }}>¿Quieres empezar por una deuda? <button onClick={onCredit} className="text-link">Añadir tarjeta o crédito</button></p>}
    <section className="section" aria-label="Resumen mensual"><div className="section-head"><h2>Tu mes</h2><button className="text-link" onClick={onAnalysis}>Ver análisis<Icon name="flecha" size={16}/></button></div><p className="hint" style={{ marginBottom: 14, textTransform: "capitalize" }}>{new Date().toLocaleDateString("es-MX",{month:"long",year:"numeric"})}</p><div className="month-stats"><div><p>Gastos</p><Money value={spend} size="stat"/></div><div><p>Ingresos</p><Money value={income} size="stat"/></div></div></section>
    <section className="section"><div className="section-head"><h2>Movimientos recientes</h2><button className="text-link" onClick={onHistory}>Ver todos</button></div>
      {txs.length ? <div className="quiet-list">{txs.slice(0,3).map((tx) => <TxRow key={tx.id} tx={tx} onEdit={onEditTx}/>)}</div> : <div className="empty-state"><Icon name="microfono" size={32}/><h3>Tu primer movimiento cambia esto.</h3><p>Cuéntanos qué gastaste. Revisa lo que entendimos y confirma para guardarlo.</p><button onClick={hasAccounts ? onCapture : onNewAccount} style={S.btn()}>{hasAccounts ? "Registrar un movimiento" : "Añadir una cuenta"}</button></div>}
    </section>
  </div>;
}
