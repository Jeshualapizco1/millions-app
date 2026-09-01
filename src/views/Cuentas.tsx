import { C, S, T } from "../lib/constants";
import { fmt } from "../lib/format";
import { fmtCurrency, toBase, type FxRates } from "../lib/currency";
import type { Account, Transaction } from "../types";

export default function Cuentas({
  accs,
  txs,
  onEdit,
  onNew,
  fx,
}: {
  accs: Account[];
  txs: Transaction[];
  onEdit: (a: Account) => void;
  onNew: () => void;
  fx: FxRates;
}) {
  return (
    <div className="fadeUp">
      {accs.map((a) => (
        <div key={a.id} onClick={() => onEdit(a)} style={{ ...S.card, borderLeft: `4px solid ${a.color}`, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: T.hero }}>{a.icon}</div>
              <div><div style={{ fontWeight: 700, fontSize: T.lg }}>{a.name}</div><div style={{ fontSize: T.sm, color: C.muted }}>{txs.filter((t) => t.accountId === a.id).length} transacciones</div></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: T.xxl, color: Number(a.balance) >= 0 ? C.green : C.red }}>{fmtCurrency(a.balance, a.currency)}</div>
              {a.currency && a.currency !== "MXN" && (
                <div style={{ fontSize: T.xs, color: C.muted, marginTop: 2 }}>≈ {fmt(toBase(a.balance, a.currency, fx))}</div>
              )}
            </div>
          </div>
        </div>
      ))}
      {accs.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Sin cuentas</div>
          <div style={{ fontSize: T.md, color: C.muted, lineHeight: 1.5 }}>
            Banco, efectivo o app de pagos, con el saldo que tenga hoy. Sin una cuenta no hay dónde cargar los gastos.
          </div>
        </div>
      )}
      <button style={{ ...S.btn(), width: "100%" }} onClick={onNew}>＋ Nueva cuenta</button>
    </div>
  );
}
