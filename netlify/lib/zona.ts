// ============================================================================
// "Hoy" y "este mes" en la zona horaria de la persona, no en la del servidor.
//
// La función de Netlify corre en UTC. Con `new Date().getMonth()` el asesor
// creía que ya era el mes siguiente desde las 17:00 del último día en
// Mazatlán, y comparaba movimientos con un mes que la persona aún no vivía.
// Puro y sin dependencias para poder probarse.
// ============================================================================

export interface HoyEnZona {
  /** "2026-09-01" en la zona dada. */
  iso: string;
  y: number;
  /** 1–12 */
  m: number;
  d: number;
  diasMes: number;
}

const partes = (d: Date, tz: string): { y: number; m: number; d: number } => {
  // en-CA da YYYY-MM-DD; se parsea por partes por si algún runtime mete
  // separadores raros.
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(d)) if (type === "year" || type === "month" || type === "day") p[type] = Number(value);
  return { y: p.year, m: p.month, d: p.day };
};

const dos = (n: number) => String(n).padStart(2, "0");

/** Una zona inválida no debe tirar al asesor: se cae a Mazatlán. */
const zonaSegura = (tz: string | null | undefined): string => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz ?? undefined }).format(new Date());
    return tz || "America/Mazatlan";
  } catch {
    return "America/Mazatlan";
  }
};

export const hoyEnZona = (tz: string | null | undefined, now: Date = new Date()): HoyEnZona => {
  const z = zonaSegura(tz);
  const { y, m, d } = partes(now, z);
  // Día 0 del mes siguiente = último día de este. Date.UTC evita la zona del servidor.
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { iso: `${y}-${dos(m)}-${dos(d)}`, y, m, d, diasMes };
};

/** ¿Un timestamptz cae en el mismo mes que `hoy`, visto desde la zona? */
export const mismoMesEnZona = (isoTimestamp: string, hoy: HoyEnZona, tz: string | null | undefined): boolean => {
  const { y, m } = partes(new Date(isoTimestamp), zonaSegura(tz));
  return y === hoy.y && m === hoy.m;
};

/**
 * Cota inferior para consultar "los movimientos del mes" en la base: el
 * primer día del mes menos uno, en UTC. Es a propósito holgada — el filtro
 * fino lo hace mismoMesEnZona en memoria — para no calcular offsets a mano.
 */
export const desdeMesHolgado = (hoy: HoyEnZona): string =>
  new Date(Date.UTC(hoy.y, hoy.m - 1, 1) - 864e5).toISOString();
