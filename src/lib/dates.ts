// ============================================================================
// Fechas en un solo lugar. Regla: un DATE de Postgres ("2026-09-05") se parsea
// como fecha LOCAL, nunca con new Date(string) — eso lo interpreta como
// medianoche UTC y en México lo corre un día hacia atrás.
// ============================================================================

/** "2026-09-05" → Date a medianoche LOCAL. */
export const parseDateOnly = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Hoy a medianoche local. */
const todayStart = (): Date => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** Días de hoy a un DATE de Postgres. 0 = hoy, negativo = vencido. */
export const daysUntilDate = (s: string | null | undefined): number | null => {
  if (!s) return null;
  return Math.round((parseDateOnly(s).getTime() - todayStart().getTime()) / 864e5);
};

/** Último día del mes de una fecha. */
const lastDayOfMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();

/**
 * Días hasta el próximo día-del-mes (corte/pago de tarjeta). 0 = hoy.
 * Día 31 en un mes de 30 se ajusta al último día del mes, sin desbordarse.
 */
export const daysUntilDayOfMonth = (day: number | null | undefined): number | null => {
  if (!day) return null;
  const today = todayStart();
  const y = today.getFullYear();
  const m = today.getMonth();
  const thisMonth = new Date(y, m, Math.min(day, lastDayOfMonth(y, m)));
  if (thisMonth.getTime() >= today.getTime())
    return Math.round((thisMonth.getTime() - today.getTime()) / 864e5);
  const next = new Date(y, m + 1, Math.min(day, lastDayOfMonth(y, m + 1)));
  return Math.round((next.getTime() - today.getTime()) / 864e5);
};

/** ¿Un timestamp cae en el mes/año local dados? */
export const inMonth = (iso: string, year: number, month: number): boolean => {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};
