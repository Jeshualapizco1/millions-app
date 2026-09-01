// ============================================================================
// Conversión de monedas.
//
// Las tasas se guardan como MXN → X (cuántos X vale 1 MXN), que es como las
// entrega el Banco Central Europeo con base MXN. Para llevar un saldo en USD
// a pesos se divide, no se multiplica: es el error fácil de cometer aquí, y
// por eso la conversión vive en un solo lugar con pruebas propias.
// ============================================================================

/**
 * El selector de moneda está apagado a propósito.
 *
 * La conversión funciona para SALDOS de cuenta, pero no para transacciones:
 * `Transaction` no guarda moneda y `sumSpend`/`sumIncome` (periods.ts) suman
 * los montos crudos. Una sola cuenta en dólares corrompe en silencio gastos,
 * ingresos, la dona, la gráfica de 6 meses, los presupuestos y la proyección
 * de cierre — sin error visible, que es lo peor que puede pasar con dinero.
 *
 * Hoy no explota porque todas las cuentas están en pesos. Abrir el registro al
 * público es exactamente el evento que lo activaría, así que se cierra la
 * puerta hasta que las transacciones guarden su moneda. Una cuenta que YA
 * tenga otra moneda la sigue mostrando y convirtiendo: apagar la entrada no
 * es borrar lo que ya existe.
 *
 * Para reactivarlo: poner esto en `true` — y antes, arreglar lo de arriba.
 */
export const SELECTOR_DE_MONEDA_ACTIVO = false;

export const CURRENCIES = ["MXN", "USD", "EUR", "CAD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABEL: Record<string, string> = {
  MXN: "Peso mexicano",
  USD: "Dólar",
  EUR: "Euro",
  CAD: "Dólar canadiense",
  GBP: "Libra",
};

/** rate[X] = cuántos X vale 1 MXN. */
export type FxRates = Record<string, number>;

/**
 * Convierte un monto a la moneda base (MXN).
 * Si no hay tasa para esa moneda, devuelve el monto tal cual: es preferible
 * mostrar una cifra sin convertir que inventar un tipo de cambio.
 */
export const toBase = (amount: number, currency: string, rates: FxRates): number => {
  if (!currency || currency === "MXN") return amount;
  const rate = rates[currency];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
};

/** Convierte de la base a otra moneda. */
export const fromBase = (amount: number, currency: string, rates: FxRates): number => {
  if (!currency || currency === "MXN") return amount;
  const rate = rates[currency];
  if (!rate || rate <= 0) return amount;
  return amount * rate;
};

/** Formatea en la moneda de la cuenta, no siempre en pesos. */
export const fmtCurrency = (n: number, currency: string): string =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: currency || "MXN" }).format(Number(n) || 0);

/** ¿Hay al menos una cuenta en moneda distinta a la base? */
export const hasForeign = (accounts: { currency?: string }[]): boolean =>
  accounts.some((a) => a.currency && a.currency !== "MXN");
