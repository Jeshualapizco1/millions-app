import ProgressBar from "../components/ProgressBar";
import { C, S } from "../lib/constants";
import { useCategories } from "../lib/categories";
import { daysUntilDate } from "../lib/dates";
import { fmt } from "../lib/format";
import type { Goal, RecurringRule } from "../types";
import type { BudgetProgress } from "../lib/budgets";
import type { TotalBudget } from "../lib/budgets";

export type BudgetWithProgress = BudgetProgress;

const FREQ_LABEL: Record<string, string> = {
  semanal: "cada semana",
  quincenal: "cada 15 días",
  mensual: "cada mes",
  anual: "cada año",
};

export default function Metas({
  budgetProgress,
  totalBudget,
  onSetTotalBudget,
  goals,
  recurring,
  onAddBudget,
  onManageCategories,
  onDeleteBudget,
  onNewGoal,
  onEditGoal,
  onAddToGoal,
  onNewRecurring,
  onEditRecurring,
  onToggleRecurring,
}: {
  budgetProgress: BudgetWithProgress[];
  totalBudget: TotalBudget | null;
  onSetTotalBudget: () => void;
  goals: Goal[];
  recurring: RecurringRule[];
  onAddBudget: () => void;
  onManageCategories: () => void;
  onDeleteBudget: (id: string) => void;
  onNewGoal: () => void;
  onEditGoal: (g: Goal) => void;
  onAddToGoal: (g: Goal) => void;
  onNewRecurring: () => void;
  onEditRecurring: (r: RecurringRule) => void;
  onToggleRecurring: (r: RecurringRule) => void;
}) {
  const { look } = useCategories();
  return (
    <div className="fadeUp">
      {/* Movimientos fijos */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>🔁 Movimientos fijos</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Se registran solos cada período</div>
          </div>
          <button onClick={onNewRecurring} style={{ ...S.btn(), padding: "8px 14px", fontSize: 13 }}>＋ Agregar</button>
        </div>
        {recurring.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 16 }}>
            Sin movimientos fijos. Agrega la renta, tus suscripciones o la nómina y dejarás de capturarlas a mano.
          </div>
        )}
        {recurring.map((r) => {
          const dias = daysUntilDate(r.next_run);
          const proximo = dias === null ? "" : dias <= 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.border}22`, opacity: r.active ? 1 : 0.5 }}>
              <div onClick={() => onEditRecurring(r)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: look(r.category).color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {look(r.category).icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {FREQ_LABEL[r.frequency]} · {r.accountName}{r.active ? ` · ${proximo}` : " · pausado"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: r.kind === "gasto" ? C.red : C.green }}>
                  {r.kind === "gasto" ? "-" : "+"}{fmt(r.amount)}
                </div>
                <button
                  onClick={() => onToggleRecurring(r)}
                  title={r.active ? "Pausar" : "Reanudar"}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 4 }}
                >
                  {r.active ? "⏸" : "▶️"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Presupuestos */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>📋 Presupuestos</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Límites mensuales por categoría</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onManageCategories} title="Gestionar categorías" style={{ ...S.btnO, padding: "8px 12px", fontSize: 13 }}>🏷️</button>
            <button onClick={onAddBudget} style={{ ...S.btn(), padding: "8px 14px", fontSize: 13 }}>＋ Agregar</button>
          </div>
        </div>
        {/* Techo global del mes */}
        <div onClick={onSetTotalBudget} style={{ background: C.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 16, cursor: "pointer", border: `1px solid ${totalBudget?.willExceed ? C.red + "55" : C.border + "44"}` }}>
          {totalBudget ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Techo del mes</span>
                <span style={{ fontSize: 12, color: C.muted }}>{fmt(totalBudget.spent)} / {fmt(totalBudget.limit)}</span>
              </div>
              <ProgressBar pct={Math.min(totalBudget.pct, 100)} color={totalBudget.pct >= 100 ? C.red : totalBudget.pct >= 80 ? C.amber : C.green} animated />
              <div style={{ fontSize: 11, marginTop: 4, color: totalBudget.willExceed ? C.amber : C.muted, fontWeight: totalBudget.willExceed ? 600 : 400 }}>
                {totalBudget.willExceed
                  ? `⚠️ Al ritmo actual cerrarías en ${fmt(totalBudget.projected)}, por encima del techo`
                  : `Al ritmo actual cerrarías en ${fmt(totalBudget.projected)}`}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.muted }}>＋ Definir un techo de gasto para todo el mes</div>
          )}
        </div>

        {budgetProgress.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 16 }}>Sin presupuestos por categoría. Define cuánto puedes gastar en cada una.</div>}
        {budgetProgress.map((b) => {
          const pctCapped = Math.min(b.pct, 100);
          const barColor = b.pct >= 100 ? C.red : b.pct >= 80 ? C.amber : C.green;
          return (
            <div key={b.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{look(b.category).icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{b.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{fmt(b.spent)} / {fmt(b.available)}</span>
                  <button onClick={() => onDeleteBudget(b.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>✕</button>
                </div>
              </div>
              <ProgressBar pct={pctCapped} color={barColor} animated />
              <div style={{ fontSize: 11, color: barColor, marginTop: 3, fontWeight: 600 }}>
                {b.pct >= 100 ? `⚠️ Excedido por ${fmt(b.spent - b.available)}` : `${b.pct}% usado — queda ${fmt(b.available - b.spent)}`}{b.carried > 0 ? ` · incluye ${fmt(b.carried)} del mes pasado` : ""}
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
