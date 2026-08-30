// ============================================================================
// Pruebas de la lógica pura. Cada bloque cubre un bug real que se corrigió,
// para que no vuelva sin que nos enteremos.
// ============================================================================
import { afterEach, describe, expect, it, vi } from "vitest";
import { daysUntilDate, daysUntilDayOfMonth, parseDateOnly } from "./dates";
import { filterByPeriod, inPeriod, periodRange, sumIncome, sumSpend } from "./periods";
import { fmtShort } from "./format";
import type { Transaction } from "../types";

const at = (iso: string) => vi.setSystemTime(new Date(iso));
afterEach(() => vi.useRealTimers());

const tx = (p: Partial<Transaction>): Transaction => ({
  id: "x", description: "d", amount: 100, kind: "gasto", type: "gasto",
  category: "Otros", categoryId: null, accountId: "a", accountName: "A",
  toAccountName: null, date: "2026-08-15T12:00:00.000Z", ...p,
});

describe("fechas", () => {
  it("parsea un DATE de Postgres como fecha local, no como medianoche UTC", () => {
    // El bug: new Date('2026-09-05') daba el 4 por la noche en México.
    const d = parseDateOnly("2026-09-05");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(5);
  });

  it("daysUntilDate cuenta 0 para hoy y negativo para vencido", () => {
    vi.useFakeTimers(); at("2026-09-05T18:00:00");
    expect(daysUntilDate("2026-09-05")).toBe(0);
    expect(daysUntilDate("2026-09-06")).toBe(1);
    expect(daysUntilDate("2026-09-01")).toBe(-4);
    expect(daysUntilDate(null)).toBeNull();
  });

  it("el día de corte alcanza el 0 (antes '¡Hoy!' era inalcanzable)", () => {
    vi.useFakeTimers(); at("2026-09-08T23:30:00");
    expect(daysUntilDayOfMonth(8)).toBe(0);
  });

  it("el día 31 no se desborda en un mes de 30", () => {
    // Estando en septiembre (30 días), el corte 31 cae el 30, no en octubre.
    vi.useFakeTimers(); at("2026-09-10T10:00:00");
    expect(daysUntilDayOfMonth(31)).toBe(20);
  });

  it("si el día del mes ya pasó, salta al mes siguiente", () => {
    vi.useFakeTimers(); at("2026-09-20T10:00:00");
    expect(daysUntilDayOfMonth(5)).toBe(15); // 5 de octubre
  });
});

describe("períodos", () => {
  it("'mes' abarca del día 1 al 1 del siguiente", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    const { from, to } = periodRange("mes");
    expect(from!.getMonth()).toBe(8);
    expect(from!.getDate()).toBe(1);
    expect(to!.getMonth()).toBe(9);
  });

  it("'todo' no filtra nada", () => {
    const list = [tx({ date: "2020-01-01T00:00:00Z" }), tx({ date: "2026-08-15T12:00:00Z" })];
    expect(filterByPeriod(list, "todo")).toHaveLength(2);
  });

  it("excluye lo que cae fuera del mes", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    expect(inPeriod("2026-09-02T10:00:00", "mes")).toBe(true);
    expect(inPeriod("2026-08-31T10:00:00", "mes")).toBe(false);
  });
});

describe("qué cuenta como gasto o ingreso", () => {
  const list = [
    tx({ kind: "gasto", amount: 100 }),
    tx({ kind: "ingreso", amount: 500 }),
    tx({ kind: "transferencia", amount: 9999 }),
    tx({ kind: "pago_credito", amount: 700 }),
    tx({ kind: "abono_meta", amount: 300 }),
  ];

  it("solo el gasto suma a gastos", () => {
    // Antes una transferencia inflaba gastos e ingresos a la vez.
    expect(sumSpend(list)).toBe(100);
  });

  it("solo el ingreso suma a ingresos", () => {
    expect(sumIncome(list)).toBe(500);
  });
});

describe("formato", () => {
  it("abrevia miles y millones", () => {
    expect(fmtShort(1500)).toBe("$2k");
    expect(fmtShort(2_500_000)).toBe("$2.5M");
  });
  it("por debajo de mil usa el formato completo", () => {
    expect(fmtShort(250)).toContain("250");
  });
});
