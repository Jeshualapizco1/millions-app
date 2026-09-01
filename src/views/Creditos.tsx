import CreditCard from "../components/CreditCard";
import { C, R, S, T, CREDIT_TYPES } from "../lib/constants";
import { fmt } from "../lib/format";
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
      <div style={{ background: "linear-gradient(135deg,#1a0f2e,#0f0820)", border: `1px solid #f472b633`, borderRadius: R.lg, padding: "20px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: T.xs, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Total de deudas</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.red, letterSpacing: -1 }}>{fmt(totalDebt)}</div>
        {credits.length > 0 && <div style={{ fontSize: T.sm, color: C.muted, marginTop: 6 }}>{credits.length} crédito{credits.length !== 1 ? "s" : ""} registrado{credits.length !== 1 ? "s" : ""}</div>}
      </div>
      {credits.length > 0 && (() => {
        const byType: Record<string, number> = {};
        credits.forEach((c) => { if (!byType[c.type]) byType[c.type] = 0; byType[c.type] += Number(c.total_debt || 0); });
        return (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {Object.entries(byType).map(([type, debt]) => {
              const t = CREDIT_TYPES[type as Credit["type"]] || CREDIT_TYPES.otro;
              return <div key={type} style={{ flex: "1 0 calc(50% - 4px)", background: t.color + "11", border: `1px solid ${t.color}33`, borderRadius: 14, padding: "10px 14px" }}><div style={{ fontSize: T.md }}>{t.icon} {t.label}</div><div style={{ fontSize: T.lg, fontWeight: 800, color: C.red, marginTop: 2 }}>{fmt(debt)}</div></div>;
            })}
          </div>
        );
      })()}
      {credits.map((c) => <CreditCard key={c.id} credit={c} onEdit={onEdit} onPay={onPay} />)}
      {credits.length === 0 && <div style={{ ...S.card, textAlign: "center", padding: 32 }}><div style={{ fontSize: 48, marginBottom: 12 }}>💳</div><div style={{ fontWeight: 700, marginBottom: 6 }}>Sin créditos</div><div style={{ fontSize: T.md, color: C.muted, marginBottom: 20 }}>Agrega tus tarjetas, hipoteca o crédito automotriz</div></div>}
      <button style={{ ...S.btn(), width: "100%" }} onClick={onAdd}>＋ Agregar crédito</button>
    </div>
  );
}
