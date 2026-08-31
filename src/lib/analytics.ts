// ============================================================================
// Patrimonio neto y proyección de cierre de mes.
// Funciones puras: reciben el estado actual y devuelven números. Sin red.
// ============================================================================
import type { Account, Credit, Transaction, Upcoming } from "../types";
import { monthLabel } from "./format";
import { toBase, type FxRates } from "./currency";

/** Efecto de un movimiento sobre la SUMA de todas las cuentas. */
const totalDelta = (t: Transaction): number => {
  switch (t.kind) {
    case "ingreso": return t.amount;
    case "gasto": return -t.amount;
    // Pagar un crédito o abonar a una meta saca dinero de las cuentas
    case "pago_credito":
    case "abono_meta": return -t.amount;
    // Una transferencia mueve entre cuentas propias: el total no cambia
    case "transferencia": return 0;
  }
};

export interface NetWorthPoint {
  label: string;
  /** Fin del mes que representa el punto. */
  at: Date;
  assets: number;
  debt: number;
  net: number;
}

/**
 * Reconstruye el patrimonio de los últimos `months` meses hacia atrás.
 *
 * El punto de hoy es exacto. Los anteriores se reconstruyen restando los
 * movimientos posteriores a cada corte, así que asumen que todo cambio de
 * saldo pasó por una transacción. Un saldo editado a mano o una deuda
 * ajustada directamente no dejan rastro y desvían la reconstrucción — por eso
 * la UI la presenta como estimación, no como historia registrada.
 */
export const netWorthHistory = (
  accs: Account[],
  credits: Credit[],
  txs: Transaction[],
  months = 6,
  now = new Date(),
  fx: FxRates = {}
): NetWorthPoint[] => {
  // Las cuentas en otra moneda se consolidan a la base antes de sumar.
  const assetsNow = accs.reduce((s, a) => s + toBase(a.balance, a.currency, fx), 0);
  const debtNow = credits.reduce((s, c) => s + Number(c.total_debt || 0), 0);

  const points: NetWorthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    // Corte: fin del mes i-ésimo hacia atrás (para i=0, el momento actual)
    const cut = i === 0 ? now : new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const after = txs.filter((t) => new Date(t.date) >= cut);

    const assets = assetsNow - after.reduce((s, t) => s + totalDelta(t), 0);
    // Cada pago posterior bajó la deuda: para ir atrás, se vuelve a sumar
    const debt = debtNow + after.filter((t) => t.kind === "pago_credito").reduce((s, t) => s + t.amount, 0);

    const at = i === 0 ? now : new Date(cut.getTime() - 1);
    points.push({ label: monthLabel(at), at, assets, debt, net: assets - debt });
  }
  return points;
};

export interface Projection {
  /** Gasto real en lo que va del mes. */
  spentSoFar: number;
  /** Ingreso real en lo que va del mes. */
  earnedSoFar: number;
  daysElapsed: number;
  daysInMonth: number;
  dailyRate: number;
  /** Gasto de movimientos fijos que aún faltan este mes. */
  pendingFixed: number;
  /** Ingreso fijo que aún falta este mes. */
  pendingIncome: number;
  /** Gasto estimado al cierre: lo gastado + el ritmo + los fijos pendientes. */
  projectedSpend: number;
  projectedNet: number;
}

/**
 * Proyecta el cierre del mes: el ritmo de gasto diario aplicado a los días que
 * faltan, más los movimientos fijos que todavía no ocurren. Los fijos se
 * cuentan aparte porque son montos conocidos, no promedio.
 */
export const projectMonth = (
  monthTxs: Transaction[],
  upcoming: Upcoming[],
  now = new Date()
): Projection => {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysLeft = daysInMonth - daysElapsed;

  const spentSoFar = monthTxs.filter((t) => t.kind === "gasto").reduce((s, t) => s + t.amount, 0);
  const earnedSoFar = monthTxs.filter((t) => t.kind === "ingreso").reduce((s, t) => s + t.amount, 0);

  // Los fijos ya ocurridos están dentro de spentSoFar; aquí solo los que faltan
  // y caen todavía dentro de este mes.
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const restOfMonth = upcoming.filter((u) => {
    const d = new Date(`${u.due}T12:00:00`);
    return d >= now && d < endOfMonth;
  });
  const pendingFixed = restOfMonth.filter((u) => u.kind === "gasto").reduce((s, u) => s + u.amount, 0);
  const pendingIncome = restOfMonth.filter((u) => u.kind === "ingreso").reduce((s, u) => s + u.amount, 0);

  const dailyRate = daysElapsed > 0 ? spentSoFar / daysElapsed : 0;
  const projectedSpend = spentSoFar + dailyRate * daysLeft + pendingFixed;
  const projectedNet = earnedSoFar + pendingIncome - projectedSpend;

  return { spentSoFar, earnedSoFar, daysElapsed, daysInMonth, dailyRate, pendingFixed, pendingIncome, projectedSpend, projectedNet };
};
