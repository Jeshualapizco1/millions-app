// ============================================================================
// Lo que viene: movimientos fijos MÁS cortes y pagos de tarjeta.
//
// Los fijos los proyecta el servidor (`upcoming_recurring`). Los créditos no
// tienen reglas: tienen un día de corte y un día de pago, y hasta ahora vivían
// en un banner rojo aparte. Eran la mitad que faltaba de "Próximos 7 días" —
// y saber antes del corte es justo el diferenciador de la app.
// ============================================================================
import { daysUntilDate, nextMonthlyDate } from "./dates";
import type { Credit, TxType, Upcoming } from "../types";

export type ProximoTipo = "fijo" | "corte" | "pago";

export interface Proximo {
  /** Único en la lista: sirve de key y no se repite entre tipos. */
  id: string;
  tipo: ProximoTipo;
  name: string;
  /** Para el signo. Un corte no mueve dinero: va como gasto con monto 0. */
  kind: TxType;
  /** 0 cuando no se sabe cuánto será (un corte, o un crédito sin pago fijo). */
  amount: number;
  /** DATE de Postgres: "2026-09-15". */
  due: string;
  /** Días desde hoy. 0 = hoy, negativo = vencido. */
  dias: number;
}

const ICONO: Record<ProximoTipo, string> = { fijo: "🔁", corte: "✂️", pago: "💳" };
export const iconoDe = (t: ProximoTipo): string => ICONO[t];

/**
 * Cortes y pagos de los próximos `dias` días.
 *
 * Una tarjeta usa `payment_day` (día del mes, se repite); un crédito con
 * mensualidad fija usa `next_payment_date`, que sí puede quedar vencida — y
 * entonces se muestra igual, en negativo, porque un pago vencido es
 * exactamente lo que hay que ver.
 */
export const proximosDeCreditos = (credits: Credit[], dias: number, hoy: Date = new Date()): Proximo[] => {
  const out: Proximo[] = [];
  for (const c of credits) {
    if (c.cut_day) {
      const due = nextMonthlyDate(c.cut_day, hoy);
      const d = daysUntilDate(due);
      if (d !== null && d <= dias) out.push({ id: `corte-${c.id}`, tipo: "corte", name: `Corte de ${c.name}`, kind: "gasto", amount: 0, due, dias: d });
    }
    if (c.payment_day) {
      const due = nextMonthlyDate(c.payment_day, hoy);
      const d = daysUntilDate(due);
      if (d !== null && d <= dias) out.push({ id: `pago-${c.id}`, tipo: "pago", name: `Pago de ${c.name}`, kind: "gasto", amount: Number(c.monthly_payment) || 0, due, dias: d });
    } else if (c.next_payment_date) {
      // Sin día del mes, la fecha es la que hay. Si ya pasó se muestra igual.
      const d = daysUntilDate(c.next_payment_date);
      if (d !== null && d <= dias) out.push({ id: `pago-${c.id}`, tipo: "pago", name: `Pago de ${c.name}`, kind: "gasto", amount: Number(c.monthly_payment) || 0, due: c.next_payment_date, dias: d });
    }
  }
  return out;
};

/** Los fijos del servidor, con los días ya calculados. */
export const proximosDeFijos = (fijos: Upcoming[]): Proximo[] =>
  fijos.map((u, i) => ({
    id: `fijo-${u.ruleId}-${i}`,
    tipo: "fijo" as const,
    name: u.name,
    kind: u.kind,
    amount: u.amount,
    due: u.due,
    dias: daysUntilDate(u.due) ?? 0,
  }));

/** Todo junto y en orden. Lo vencido primero: es lo que urge. */
export const proximos = (fijos: Upcoming[], credits: Credit[], dias = 7, hoy: Date = new Date()): Proximo[] =>
  [...proximosDeFijos(fijos), ...proximosDeCreditos(credits, dias, hoy)].sort(
    (a, b) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name)
  );

/**
 * Impacto neto en el saldo. Los cortes no cuentan: no mueven dinero, avisan
 * de que se cierra el periodo.
 */
export const impactoNeto = (items: Proximo[]): number =>
  items.filter((i) => i.tipo !== "corte").reduce((s, i) => s + (i.kind === "ingreso" ? i.amount : -i.amount), 0);
