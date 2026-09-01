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

/**
 * El próximo día `day` del mes, como DATE de Postgres ("2026-09-05").
 *
 * Se arma con getFullYear/getMonth/getDate y NO con toISOString: en México
 * este último devuelve el día siguiente durante toda la tarde, y una regla
 * mensual creada a las 7pm arrancaría un día tarde. Si el día no existe en el
 * mes (31 en septiembre), cae en el último, igual que los cortes de tarjeta.
 */
export const nextMonthlyDate = (day: number, now: Date = new Date()): string => {
  const d = Math.min(Math.max(Math.round(day) || 1, 1), 31);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const m = today.getMonth();
  const esteMes = new Date(y, m, Math.min(d, lastDayOfMonth(y, m)));
  const objetivo =
    esteMes.getTime() >= today.getTime() ? esteMes : new Date(y, m + 1, Math.min(d, lastDayOfMonth(y, m + 1)));
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${objetivo.getFullYear()}-${dos(objetivo.getMonth() + 1)}-${dos(objetivo.getDate())}`;
};

/** ¿Un timestamp cae en el mes/año local dados? */
export const inMonth = (iso: string, year: number, month: number): boolean => {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};

/**
 * Días que faltan para que se cumpla un plazo de gracia.
 *
 * Recibe un timestamptz (no un DATE), así que `new Date` es lo correcto aquí:
 * el instante ya trae zona y no hay nada que corregir.
 *
 * Redondea hacia arriba para no prometer de menos: si faltan 29.2 días, decir
 * "29" haría que la cuenta pareciera morir un día antes de lo que morirá.
 * Nunca devuelve negativo — pasado el plazo es 0, que se lee como "hoy".
 */
export const diasRestantesDeGracia = (
  requestedAt: string | null | undefined,
  graceDays: number,
  now: Date = new Date()
): number | null => {
  if (!requestedAt) return null;
  const limite = new Date(requestedAt).getTime() + graceDays * 864e5;
  return Math.max(0, Math.ceil((limite - now.getTime()) / 864e5));
};
