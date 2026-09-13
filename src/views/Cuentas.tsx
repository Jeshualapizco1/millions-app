import { C, S, T } from "../lib/constants";
import Icon from "../components/Icon";
import Money from "../components/Money";
import { toBase, type FxRates } from "../lib/currency";
import type { Account, Transaction } from "../types";

export default function Cuentas({
  accs,
  txs,
  historialCompleto,
  onEdit,
  onNew,
  fx,
}: {
  accs: Account[];
  txs: Transaction[];
  /** Mientras es false el conteo por cuenta sería parcial (D9). */
  historialCompleto: boolean;
  onEdit: (a: Account) => void;
  onNew: () => void;
  fx: FxRates;
}) {
  return (
    <div className="fadeUp">
      <div className="section-head"><h2>Tus cuentas</h2><button className="text-link" onClick={onNew}>Añadir cuenta <Icon name="mas" size={18}/></button></div>
      <p className="hint" style={{ marginBottom: 8 }}>Efectivo, débito y cuentas de pagos. Las tarjetas de crédito van en Créditos.</p>
      {accs.map((a) => <button key={a.id} className="account-row" onClick={() => onEdit(a)} aria-label={`Ver y editar ${a.name}`}>
        <span className="account-icon">{a.icon}</span><span className="account-info"><strong>{a.name}</strong><span className="hint">{historialCompleto ? `${txs.filter((t) => t.accountId === a.id || t.toAccountId === a.id).length} movimientos` : "Cargando movimientos"} · {a.currency || "MXN"}</span></span>
        <span style={{ textAlign: "right" }}><Money value={a.balance} currency={a.currency || "MXN"}/>{a.currency && a.currency !== "MXN" && <span className="hint" style={{ display: "block" }}>≈ <Money value={toBase(a.balance,a.currency,fx)}/></span>}</span><Icon name="flecha" size={17}/>
      </button>)}
      {accs.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Sin cuentas</div>
          <div style={{ fontSize: T.md, color: C.muted, lineHeight: 1.5 }}>
            Banco, efectivo o app de pagos, con el saldo que tenga hoy. Sin una cuenta no hay dónde cargar los gastos.
          </div>
        </div>
      )}
      <button style={{ ...S.btn(), width: "100%", marginTop: 20 }} onClick={onNew}>＋ Nueva cuenta</button>
    </div>
  );
}
