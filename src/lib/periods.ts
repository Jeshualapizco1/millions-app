// ============================================================================
// Un solo lugar decide "qué entra en el período" y "qué cuenta como gasto".
// Antes el dashboard mezclaba totales de toda la vida con cifras del mes, y
// las transferencias inflaban gastos e ingresos a la vez.
// ============================================================================
import type { Transaction } from "../types";

export type PeriodKey = "mes" | "mesPasado" | "3m" | "anio" | "todo";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "mes", label: "Este mes" },
  { key: "mesPasado", label: "Mes pasado" },
  { key: "3m", label: "3 meses" },
  { key: "anio", label: "Año" },
  { key: "todo", label: "Todo" },
];

/** Rango [desde, hasta) en horario local. `null` = sin límite. */
export const periodRange = (key: PeriodKey, now = new Date()): { from: Date | null; to: Date | null } => {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "mes":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
    case "mesPasado":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    case "3m":
      return { from: new Date(y, m - 2, 1), to: new Date(y, m + 1, 1) };
    case "anio":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
    case "todo":
      return { from: null, to: null };
  }
};

export const inPeriod = (iso: string, key: PeriodKey, now = new Date()): boolean => {
  const { from, to } = periodRange(key, now);
  if (!from || !to) return true;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
};

export const filterByPeriod = (txs: Transaction[], key: PeriodKey): Transaction[] =>
  key === "todo" ? txs : txs.filter((t) => inPeriod(t.date, key));

/**
 * Solo gasto e ingreso mueven las cifras de "gasté" / "gané".
 * Una transferencia mueve dinero entre cuentas propias, un pago de crédito
 * salda deuda y un abono a meta cambia de bolsillo: ninguno es consumo ni
 * ingreso nuevo, y contarlos infla ambos lados.
 */
export const isSpend = (t: Transaction) => t.kind === "gasto";
export const isIncome = (t: Transaction) => t.kind === "ingreso";

export const sumSpend = (txs: Transaction[]) => txs.filter(isSpend).reduce((s, t) => s + t.amount, 0);
export const sumIncome = (txs: Transaction[]) => txs.filter(isIncome).reduce((s, t) => s + t.amount, 0);
