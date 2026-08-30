import ProgressBar from "../components/ProgressBar";
import { C, CATS, S } from "../lib/constants";
import { daysUntilDate } from "../lib/dates";
import { fmt } from "../lib/format";
import type { Budget, Goal } from "../types";

export type BudgetWithProgress = Budget & { spent: number; pct: number };

export default function Metas({
  budgetProgress,
  goals,
  onAddBudget,
  onDeleteBudget,
  onNewGoal,
  onEditGoal,
  onAddToGoal,
}: {
  budgetProgress: BudgetWithProgress[];
  goals: Goal[];
  onAddBudget: () => void;
  onDeleteBudget: (id: string) => void;
  onNewGoal: () => void;
  onEditGoal: (g: Goal) => void;
  onAddToGoal: (g: Goal) => void;
}) {
  return (
    <div className="fadeUp">
      {/* Presupuestos */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>📋 Presupuestos</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Límites mensuales por categoría</div>
          </div>
          <button onClick={onAddBudget} style={{ ...S.btn(), padding: "8px 14px", fontSize: 13 }}>＋ Agregar</button>
        </div>
        {budgetProgress.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 16 }}>Sin presupuestos. Define cuánto puedes gastar por categoría.</div>}
        {budgetProgress.map((b) => {
          const pctCapped = Math.min(b.pct, 100);
          const barColor = b.pct >= 100 ? C.red : b.pct >= 80 ? C.amber : C.green;
          return (
            <div key={b.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{CATS[b.category]?.icon || "📦"}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{b.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{fmt(b.spent)} / {fmt(b.amount)}</span>
                  <button onClick={() => onDeleteBudget(b.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>
              </div>
              <ProgressBar pct={pctCapped} color={barColor} animated />
              <div style={{ fontSize: 11, color: barColor, marginTop: 3, fontWeight: 600 }}>
                {b.pct >= 100 ? `⚠️ Excedido por ${fmt(b.spent - b.amount)}` : b.pct >= 80 ? `⚠️ ${b.pct}% usado — queda ${fmt(b.amount - b.spent)}` : `${b.pct}% usado — queda ${fmt(b.amount - b.spent)}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metas de ahorro */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>🎯 Metas de ahorro</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Objetivos financieros</div>
          </div>
          <button onClick={onNewGoal} style={{ ...S.btn(), padding: "8px 14px", fontSize: 13 }}>＋ Nueva</button>
        </div>
        {goals.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 16 }}>Sin metas aún. Define tus objetivos financieros.</div>}
        {goals.map((g) => {
          const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0;
          const barColor = pct >= 100 ? C.green : pct >= 60 ? C.aLight : C.accent;
          const targetDate = g.target_date;
          const daysLeft = daysUntilDate(g.target_date);
          // Estimate months to complete
          const remaining = Number(g.target_amount) - Number(g.current_amount);
          return (
            <div key={g.id} style={{ background: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${g.color}33` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: g.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{g.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{g.name}</div>
                    {targetDate && <div style={{ fontSize: 11, color: daysLeft! <= 30 ? C.amber : C.muted }}>{daysLeft! <= 0 ? "¡Fecha vencida!" : daysLeft === 1 ? "Mañana" : `${daysLeft} días restantes`}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onAddToGoal(g)} style={{ background: g.color + "22", border: `1px solid ${g.color}44`, color: g.color, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>＋ Abonar</button>
                  <button onClick={() => onEditGoal(g)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15 }}>✏️</button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.muted }}>Ahorrado</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{fmt(g.current_amount)} <span style={{ color: C.muted, fontWeight: 400 }}>/ {fmt(g.target_amount)}</span></span>
              </div>
              <ProgressBar pct={pct} color={barColor} animated style={{ marginBottom: 6 }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{pct >= 100 ? "✅ ¡Meta alcanzada!" : `${pct}% completado`}</span>
                {remaining > 0 && <span style={{ fontSize: 11, color: C.muted }}>Faltan {fmt(remaining)}</span>}
              </div>
              {g.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontStyle: "italic" }}>{g.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
