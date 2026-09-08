import type { Category, Transaction } from "../types";
import type { Proximo } from "./upcoming";
import { sumIncome, sumSpend } from "./periods";

export function moneyParts(value: unknown, currency = "MXN", signed = false) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  const formatter = new Intl.NumberFormat("es-MX", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: signed ? "always" : "auto" });
  return { text: formatter.format(safe), parts: formatter.formatToParts(safe), long: Math.abs(safe) >= 1_000_000 };
}
/** Meses locales, sin convertir DATE ni mezclar transferencias con consumo. */
export function monthSummary(txs: Transaction[], year: number, month: number, categories: Category[]) {
  const rows = txs.filter((t) => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month; });
  const totals = new Map<string, number>();
  rows.filter((t) => t.kind === "gasto").forEach((t) => totals.set(t.category || "Otros", (totals.get(t.category || "Otros") || 0) + Number(t.amount)));
  return {
    rows, income: sumIncome(rows), spend: sumSpend(rows),
    categories: [...totals].map(([label, value]) => ({ label, value, icon: categories.find((c) => c.name === label)?.icon || "📦", color: ["#5678ff", "#9faed9", "#c792a9", "#7889ad", "#beb090", "#8a91bb"][Array.from(label).reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 0) % 6] })).sort((a, b) => b.value - a.value),
  };
}
export function homeAttention(balance: number, upcoming: Proximo[], budget: { limit: number; spent: number } | null) {
  if (balance < 0) return { kind: "balance" as const };
  const next = [...upcoming].filter((p) => p.kind === "gasto").sort((a, b) => a.dias - b.dias || Number(b.tipo === "pago") - Number(a.tipo === "pago"))[0];
  if (next && next.dias <= 7) return { kind: "upcoming" as const, next };
  if (budget) return { kind: "budget" as const, remaining: budget.limit - budget.spent };
  return { kind: "quiet" as const, next };
}
export const dueLabel = (days: number) => days < 0 ? `Vencido hace ${Math.abs(days)} días` : days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`;
