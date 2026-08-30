import { C, CREDIT_TYPES } from "../lib/constants";
import { daysUntilDate } from "../lib/dates";
import { daysUntil, fmt } from "../lib/format";
import type { Credit } from "../types";
import ProgressBar from "./ProgressBar";

export default function CreditCard({ credit, onEdit, onPay }: { credit: Credit; onEdit: (c: Credit) => void; onPay?: (c: Credit) => void }) {
  const type = CREDIT_TYPES[credit.type] || CREDIT_TYPES.otro;
  const debt = Number(credit.total_debt) || 0;
  const limit = Number(credit.credit_limit) || 0;
  const util = limit > 0 ? Math.round((debt / limit) * 100) : 0;
  const utilColor = util < 30 ? C.green : util < 70 ? C.amber : C.red;
  const daysCorte = daysUntil(credit.cut_day);
  const daysPago = daysUntil(credit.payment_day);
  const daysNext = daysUntilDate(credit.next_payment_date);
  const uc = (d: number | null) => (d === null ? C.muted : d <= 3 ? C.red : d <= 7 ? C.amber : C.green);
  return (
    <div onClick={() => onEdit(credit)} style={{ background: C.card, border: `1px solid ${C.border}22`, borderRadius: 20, padding: 18, marginBottom: 12, cursor: "pointer", borderLeft: `4px solid ${type.color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: type.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{type.icon}</div>
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>{credit.name}</div><div style={{ fontSize: 11, color: C.muted }}>{credit.institution || type.label}</div></div>
        </div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>{fmt(debt)}</div><div style={{ fontSize: 11, color: C.muted }}>deuda</div></div>
      </div>
      {credit.type === "tarjeta" && limit > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: C.muted }}>Utilización</span><span style={{ fontSize: 11, fontWeight: 700, color: utilColor }}>{util}% de {fmt(limit)}</span></div>
          <ProgressBar pct={Math.min(util, 100)} color={utilColor} height={6} />
        </div>
      )}
      {credit.type !== "tarjeta" && Number(credit.monthly_payment) > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "8px 12px", textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Mensualidad</div><div style={{ fontSize: 14, fontWeight: 700, color: C.aLight }}>{fmt(credit.monthly_payment)}</div></div>
          {credit.interest_rate != null && <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "8px 12px", textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Tasa</div><div style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{credit.interest_rate}%</div></div>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {credit.type === "tarjeta" && credit.cut_day && <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: C.muted }}>Corte día {credit.cut_day}</div><div style={{ fontSize: 13, fontWeight: 700, color: uc(daysCorte) }}>{daysCorte === 0 ? "¡Hoy!" : daysCorte === 1 ? "Mañana" : `${daysCorte}d`}</div></div>}
        {credit.type === "tarjeta" && credit.payment_day && <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: C.muted }}>Pago día {credit.payment_day}</div><div style={{ fontSize: 13, fontWeight: 700, color: uc(daysPago) }}>{daysPago === 0 ? "¡Hoy!" : daysPago === 1 ? "Mañana" : `${daysPago}d`}</div></div>}
        {credit.type !== "tarjeta" && credit.next_payment_date && <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: C.muted }}>Próximo pago</div><div style={{ fontSize: 12, fontWeight: 700, color: uc(daysNext) }}>{daysNext! <= 0 ? "¡Vencido!" : daysNext === 1 ? "Mañana" : `${daysNext}d`}</div></div>}
      </div>
      {onPay && debt > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPay(credit); }}
          style={{ width: "100%", marginTop: 12, background: type.color + "22", border: `1px solid ${type.color}55`, color: type.color, borderRadius: 12, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Registrar pago
        </button>
      )}
    </div>
  );
}
