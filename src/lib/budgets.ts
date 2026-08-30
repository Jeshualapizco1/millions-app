// ============================================================================
// Cálculo de presupuestos con arrastre.
//
// Un presupuesto con rollover suma lo que sobró del mes anterior. Se arrastra
// UN mes, no toda la historia: acumular indefinidamente convierte el límite en
// un número sin significado, y quien lo activa quiere perdonar un mes flojo,
// no construir un colchón perpetuo.
// ============================================================================
import type { Budget, Transaction } from "../types";
import { isSpend } from "./periods";

export interface BudgetProgress extends Budget {
  /** Gastado este mes en la categoría. */
  spent: number;
  /** Lo que sobró el mes pasado y se arrastra (0 si no tiene rollover). */
  carried: number;
  /** Límite efectivo del mes: amount + carried. */
  available: number;
  pct: number;
}

const spentIn = (txs: Transaction[], category: string, year: number, month: number): number =>
  txs
    .filter((t) => {
      if (!isSpend(t) || t.category !== category) return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((s, t) => s + t.amount, 0);

export const budgetProgress = (budgets: Budget[], txs: Transaction[], now = new Date()): BudgetProgress[] => {
  const y = now.getFullYear();
  const m = now.getMonth();
  const prev = new Date(y, m - 1, 1);

  return budgets.map((b) => {
    const spent = spentIn(txs, b.category, y, m);
    const carried = b.rollover ? Math.max(b.amount - spentIn(txs, b.category, prev.getFullYear(), prev.getMonth()), 0) : 0;
    const available = b.amount + carried;
    return { ...b, spent, carried, available, pct: available > 0 ? Math.round((spent / available) * 100) : 0 };
  });
};

export interface TotalBudget {
  limit: number;
  spent: number;
  pct: number;
  /** Gasto estimado al cierre, para avisar antes de rebasar. */
  projected: number;
  /** true si el ritmo actual lleva a pasarse. */
  willExceed: boolean;
}

export const totalBudgetStatus = (limit: number | null, spent: number, projected: number): TotalBudget | null => {
  if (!limit || limit <= 0) return null;
  return {
    limit,
    spent,
    pct: Math.round((spent / limit) * 100),
    projected,
    willExceed: projected > limit,
  };
};
