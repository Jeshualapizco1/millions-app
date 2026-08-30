// ============================================================================
// Traduce lo que el asesor propone a una operación real.
//
// El modelo trabaja con NOMBRES (nunca ve un UUID), así que aquí se resuelven
// contra los datos del usuario. Si algo no coincide, se falla con un mensaje
// claro en vez de adivinar: equivocarse de cuenta mueve dinero real.
// ============================================================================
import { api } from "./api";
import { fmt } from "./format";
import type { Account, Credit, Goal, ProposedAction } from "../types";

export interface ActionContext {
  accs: Account[];
  credits: Credit[];
  goals: Goal[];
}

const findByName = <T extends { name: string }>(list: T[], name: string, tipo: string): T => {
  const needle = (name ?? "").trim().toLowerCase();
  const exact = list.find((x) => x.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = list.filter((x) => x.name.toLowerCase().includes(needle) || needle.includes(x.name.toLowerCase()));
  if (partial.length === 1) return partial[0];
  throw new Error(
    partial.length > 1
      ? `"${name}" coincide con varios: ${partial.map((x) => x.name).join(", ")}`
      : `No encontré ${tipo} "${name}". Tienes: ${list.map((x) => x.name).join(", ") || "ninguna"}`
  );
};

const monto = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error("El monto debe ser un número mayor a cero");
  return n;
};

/** Texto de la tarjeta de confirmación. Lanza si la acción no se puede resolver. */
export const describeAction = (a: ProposedAction, ctx: ActionContext): string => {
  const i = a.input;
  switch (a.name) {
    case "transferir": {
      const from = findByName(ctx.accs, i.desde, "la cuenta");
      const to = findByName(ctx.accs, i.hacia, "la cuenta");
      const n = monto(i.monto);
      if (from.id === to.id) throw new Error("El origen y el destino son la misma cuenta");
      return `Mover ${fmt(n)} de ${from.name} a ${to.name}.\n${from.name} quedaría en ${fmt(from.balance - n)}.`;
    }
    case "pagar_credito": {
      const cr = findByName(ctx.credits, i.credito, "el crédito");
      const acc = findByName(ctx.accs, i.desde_cuenta, "la cuenta");
      const n = monto(i.monto);
      return `Pagar ${fmt(n)} a ${cr.name} desde ${acc.name}.\n${acc.name} quedaría en ${fmt(acc.balance - n)} y la deuda en ${fmt(Math.max(Number(cr.total_debt) - n, 0))}.`;
    }
    case "registrar_movimiento": {
      const acc = findByName(ctx.accs, i.cuenta, "la cuenta");
      const n = monto(i.monto);
      const esGasto = i.tipo === "gasto";
      return `Registrar un ${esGasto ? "gasto" : "ingreso"} de ${fmt(n)} en ${acc.name}: "${i.descripcion}" (${i.categoria}).\n${acc.name} quedaría en ${fmt(acc.balance + (esGasto ? -n : n))}.`;
    }
    case "crear_presupuesto":
      return `Poner un límite mensual de ${fmt(monto(i.monto))} en ${i.categoria}.`;
    case "abonar_meta": {
      const g = findByName(ctx.goals, i.meta, "la meta");
      const n = monto(i.monto);
      const acc = i.desde_cuenta ? findByName(ctx.accs, i.desde_cuenta, "la cuenta") : null;
      return acc
        ? `Abonar ${fmt(n)} a ${g.name} desde ${acc.name}.\n${acc.name} quedaría en ${fmt(acc.balance - n)}.`
        : `Abonar ${fmt(n)} a ${g.name}, solo como registro (no descuenta de ninguna cuenta).`;
    }
    default:
      throw new Error(`Acción desconocida: ${a.name}`);
  }
};

/** Ejecuta la acción ya confirmada. Devuelve el resumen que se le manda al modelo. */
export const runAction = async (a: ProposedAction, ctx: ActionContext): Promise<string> => {
  const i = a.input;
  switch (a.name) {
    case "transferir": {
      const from = findByName(ctx.accs, i.desde, "la cuenta");
      const to = findByName(ctx.accs, i.hacia, "la cuenta");
      const n = monto(i.monto);
      await api.transfer({ fromId: from.id, toId: to.id, amount: n, description: i.concepto || "Transferencia" }, ctx.accs);
      return `Transferencia hecha: ${fmt(n)} de ${from.name} a ${to.name}.`;
    }
    case "pagar_credito": {
      const cr = findByName(ctx.credits, i.credito, "el crédito");
      const acc = findByName(ctx.accs, i.desde_cuenta, "la cuenta");
      const n = monto(i.monto);
      await api.payCredit({ creditId: cr.id, accountId: acc.id, amount: n }, ctx.accs);
      return `Pago registrado: ${fmt(n)} a ${cr.name} desde ${acc.name}.`;
    }
    case "registrar_movimiento": {
      const acc = findByName(ctx.accs, i.cuenta, "la cuenta");
      const n = monto(i.monto);
      await api.applyTx(
        { accountId: acc.id, kind: i.tipo === "ingreso" ? "ingreso" : "gasto", amount: n, description: String(i.descripcion), category: i.categoria },
        ctx.accs
      );
      return `Movimiento registrado: ${i.tipo} de ${fmt(n)} en ${acc.name}.`;
    }
    case "crear_presupuesto": {
      const n = monto(i.monto);
      await api.upsertBudget({ category: String(i.categoria), amount: n });
      return `Presupuesto de ${i.categoria} fijado en ${fmt(n)} mensuales.`;
    }
    case "abonar_meta": {
      const g = findByName(ctx.goals, i.meta, "la meta");
      const n = monto(i.monto);
      const acc = i.desde_cuenta ? findByName(ctx.accs, i.desde_cuenta, "la cuenta") : null;
      await api.contributeGoal({ goalId: g.id, amount: n, accountId: acc?.id ?? null });
      return `Abono hecho: ${fmt(n)} a ${g.name}${acc ? ` desde ${acc.name}` : " (solo registro)"}.`;
    }
    default:
      throw new Error(`Acción desconocida: ${a.name}`);
  }
};
