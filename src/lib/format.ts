export const fmt = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);

export const fmtShort = (n: number | string | null | undefined) => {
  const x = Number(n) || 0;
  return x >= 1000000 ? `$${(x / 1000000).toFixed(1)}M` : x >= 1000 ? `$${(x / 1000).toFixed(0)}k` : fmt(x);
};

export const daysUntil = (day: number | null | undefined): number | null => {
  if (!day) return null;
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), day);
  if (t <= now) t.setMonth(t.getMonth() + 1);
  return Math.ceil((t.getTime() - now.getTime()) / 864e5);
};

export const monthLabel = (d: Date) => d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
