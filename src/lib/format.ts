export const fmt = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);

export const fmtShort = (n: number | string | null | undefined) => {
  const x = Number(n) || 0;
  return x >= 1000000 ? `$${(x / 1000000).toFixed(1)}M` : x >= 1000 ? `$${(x / 1000).toFixed(0)}k` : fmt(x);
};

// Delegado a lib/dates: 0 = hoy es alcanzable y el día 31 no se desborda en meses cortos.
export { daysUntilDayOfMonth as daysUntil } from "./dates";

export const monthLabel = (d: Date) => d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
