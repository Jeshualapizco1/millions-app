// ============================================================================
// Pruebas de la lógica pura. Cada bloque cubre un bug real que se corrigió,
// para que no vuelva sin que nos enteremos.
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysUntilDate, daysUntilDayOfMonth, diasRestantesDeGracia, diasRestantesDePlazo, nextMonthlyDate, parseDateOnly } from "./dates";
import { COBRO_INCOMPLETO, CORREO_ARCO, DOMICILIO, GRACIA_DIAS, LEGAL_INCOMPLETO, LEGAL_VERSION, PRUEBA_DIAS, PRIVACIDAD, RESPONSABLE, TERMINOS } from "./legal";
import { bienvenida, contextoParaAsesor, PREGUNTAS, RESPUESTAS_VACIAS, type Respuestas } from "./onboarding";
import { filterByPeriod, inPeriod, periodRange, sumIncome, sumSpend } from "./periods";
import { fmtShort } from "./format";
import { netWorthHistory, projectMonth } from "./analytics";
import { budgetProgress, totalBudgetStatus } from "./budgets";
import { buildRows, guessColumns, parseAmount, parseCSV, parseDate } from "./csvImport";
import { fromBase, hasForeign, SELECTOR_DE_MONEDA_ACTIVO, toBase } from "./currency";
import { budgetAlertKey, creditAlertKey, dismissAlert, isDismissed } from "./alerts";
import { findByName } from "./names";
import { consultasRestantes, textoAiUso } from "./aiUso";
import type { Account, Budget, Credit, Transaction } from "../types";

// localStorage mínimo: las pruebas corren en Node y solo lo usa lib/alerts.
// Un stub de seis líneas evita traer jsdom entero para esto.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

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

describe("nextMonthlyDate", () => {
  it("si el día todavía no pasa, cae en este mes", () => {
    expect(nextMonthlyDate(15, new Date(2026, 8, 1, 9, 0))).toBe("2026-09-15");
  });

  it("si el día ya pasó, cae en el siguiente", () => {
    expect(nextMonthlyDate(5, new Date(2026, 8, 20, 9, 0))).toBe("2026-10-05");
  });

  it("hoy mismo cuenta como próximo, no como pasado", () => {
    expect(nextMonthlyDate(10, new Date(2026, 8, 10, 23, 0))).toBe("2026-09-10");
  });

  it("el día 31 en un mes de 30 cae en el último, sin desbordarse", () => {
    expect(nextMonthlyDate(31, new Date(2026, 8, 1, 9, 0))).toBe("2026-09-30");
  });

  it("de tarde en México NO se corre al día siguiente", () => {
    // Con toISOString, las 7pm del 1 de septiembre en Culiacán ya son el 2 en
    // UTC: la regla mensual habría arrancado un día tarde, cada mes.
    expect(nextMonthlyDate(5, new Date(2026, 8, 1, 19, 30))).toBe("2026-09-05");
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

describe("patrimonio neto", () => {
  const acc = (balance: number, currency = "MXN"): Account => ({ id: "a", name: "A", balance, currency, icon: "🏦", color: "#000000" });
  const cred = (total_debt: number): Credit => ({
    id: "c", name: "C", type: "tarjeta", institution: null, total_debt,
    credit_limit: null, monthly_payment: null, cut_day: null, payment_day: null,
    next_payment_date: null, interest_rate: null, notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
  });

  it("el punto de hoy es activos menos deuda", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    const h = netWorthHistory([acc(10000)], [cred(3000)], [], 3);
    expect(h[h.length - 1].net).toBe(7000);
  });

  it("reconstruye hacia atrás restando los movimientos posteriores", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    // Hoy hay 10,000. En septiembre entraron 2,000 de ingreso.
    // Al cierre de agosto debía haber 8,000.
    const txs = [tx({ kind: "ingreso", type: "ingreso", amount: 2000, date: "2026-09-10T10:00:00" })];
    const h = netWorthHistory([acc(10000)], [], txs, 2);
    expect(h[0].assets).toBe(8000); // cierre de agosto
    expect(h[1].assets).toBe(10000); // hoy
  });

  it("una transferencia no altera el patrimonio", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    const txs = [tx({ kind: "transferencia", amount: 5000, date: "2026-09-10T10:00:00" })];
    const h = netWorthHistory([acc(10000)], [], txs, 2);
    expect(h[0].assets).toBe(10000);
    expect(h[1].assets).toBe(10000);
  });

  it("un pago de crédito baja activos y baja deuda: el patrimonio no cambia", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    // Hoy: 8,000 en cuenta y 1,000 de deuda tras pagar 2,000 en septiembre.
    // Antes del pago: 10,000 en cuenta y 3,000 de deuda. Neto igual: 7,000.
    const txs = [tx({ kind: "pago_credito", amount: 2000, date: "2026-09-10T10:00:00" })];
    const h = netWorthHistory([acc(8000)], [cred(1000)], txs, 2);
    expect(h[0].net).toBe(7000);
    expect(h[1].net).toBe(7000);
  });
});

describe("proyección de cierre de mes", () => {
  it("extrapola el ritmo diario a los días que faltan", () => {
    vi.useFakeTimers(); at("2026-09-10T10:00:00"); // día 10 de 30
    const txs = [tx({ kind: "gasto", amount: 1000, date: "2026-09-05T10:00:00" })];
    const p = projectMonth(txs, [], new Date());
    expect(p.dailyRate).toBe(100); // 1000 / 10 días
    expect(p.projectedSpend).toBe(3000); // 1000 + 100 × 20 días restantes
  });

  it("suma los fijos pendientes como monto conocido, no como promedio", () => {
    vi.useFakeTimers(); at("2026-09-10T10:00:00");
    const txs = [tx({ kind: "gasto", amount: 1000, date: "2026-09-05T10:00:00" })];
    const up = [{ ruleId: "r", name: "Renta", kind: "gasto" as const, amount: 12000, accountId: "a", due: "2026-09-20" }];
    const p = projectMonth(txs, up, new Date());
    expect(p.pendingFixed).toBe(12000);
    expect(p.projectedSpend).toBe(15000); // 3000 del ritmo + 12000 fijo
  });

  it("ignora los fijos que caen en el mes siguiente", () => {
    vi.useFakeTimers(); at("2026-09-25T10:00:00");
    const up = [{ ruleId: "r", name: "Renta", kind: "gasto" as const, amount: 12000, accountId: "a", due: "2026-10-01" }];
    const p = projectMonth([], up, new Date());
    expect(p.pendingFixed).toBe(0);
  });
});

describe("presupuestos con arrastre", () => {
  const b = (category: string, amount: number, rollover: boolean): Budget =>
    ({ id: category, category, categoryId: category, amount, rollover });

  it("sin arrastre, el límite es el monto", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    const txs = [tx({ kind: "gasto", amount: 400, category: "Alimentación", date: "2026-09-05T10:00:00" })];
    const [p] = budgetProgress([b("Alimentación", 1000, false)], txs);
    expect(p.carried).toBe(0);
    expect(p.available).toBe(1000);
    expect(p.pct).toBe(40);
  });

  it("con arrastre suma lo que sobró el mes pasado", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    // Agosto: presupuesto 1000, gastó 300 → sobran 700 y se arrastran
    const txs = [
      tx({ kind: "gasto", amount: 300, category: "Alimentación", date: "2026-08-10T10:00:00" }),
      tx({ kind: "gasto", amount: 200, category: "Alimentación", date: "2026-09-05T10:00:00" }),
    ];
    const [p] = budgetProgress([b("Alimentación", 1000, true)], txs);
    expect(p.carried).toBe(700);
    expect(p.available).toBe(1700);
  });

  it("si el mes pasado se excedió, no arrastra deuda", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    const txs = [tx({ kind: "gasto", amount: 1500, category: "Alimentación", date: "2026-08-10T10:00:00" })];
    const [p] = budgetProgress([b("Alimentación", 1000, true)], txs);
    expect(p.carried).toBe(0);
    expect(p.available).toBe(1000);
  });

  it("una transferencia no consume presupuesto", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    const txs = [tx({ kind: "transferencia", amount: 900, category: "Alimentación", date: "2026-09-05T10:00:00" })];
    const [p] = budgetProgress([b("Alimentación", 1000, false)], txs);
    expect(p.spent).toBe(0);
  });

  it("el techo global avisa cuando el ritmo lo va a rebasar", () => {
    expect(totalBudgetStatus(10000, 4000, 12000)?.willExceed).toBe(true);
    expect(totalBudgetStatus(10000, 4000, 9000)?.willExceed).toBe(false);
    expect(totalBudgetStatus(null, 4000, 9000)).toBeNull();
  });
});

describe("lectura de CSV bancario", () => {
  it("respeta comas y comillas dentro de un campo", () => {
    const g = parseCSV('Fecha,Concepto,Cargo\n01/09/2026,"OXXO, sucursal centro",250.50');
    expect(g[1][1]).toBe("OXXO, sucursal centro");
    expect(g[1][2]).toBe("250.50");
  });

  it("entiende montos en formato mexicano e inglés", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("$ 2,500.00")).toBe(2500);
    expect(parseAmount("(300.00)")).toBe(-300);
    expect(parseAmount("")).toBeNull();
  });

  it("lee fechas día/mes y también ISO", () => {
    expect(parseDate("05/09/2026", true)?.getMonth()).toBe(8); // septiembre
    expect(parseDate("05/09/2026", false)?.getMonth()).toBe(4); // mayo
    expect(parseDate("2026-09-05")?.getDate()).toBe(5);
  });

  it("adivina las columnas por el encabezado", () => {
    const m = guessColumns(["Fecha", "Descripción", "Cargo", "Abono"]);
    expect(m.date).toBe(0);
    expect(m.description).toBe(1);
    expect(m.amount).toBe(2);
    expect(m.credit).toBe(3);
  });

  it("marca como duplicado lo que ya existe y lo deja desmarcado", () => {
    const existing = [tx({ amount: 250, description: "OXXO", date: "2026-09-05T10:00:00" })];
    const grid = parseCSV("Fecha,Concepto,Cargo\n05/09/2026,OXXO,250\n05/09/2026,Starbucks,90");
    const rows = buildRows(grid, { date: 0, description: 1, amount: 2 }, existing, { hasHeader: true, dayFirst: true });
    expect(rows).toHaveLength(2);
    expect(rows[0].duplicate).toBe(true);
    expect(rows[0].skip).toBe(true);
    expect(rows[1].duplicate).toBe(false);
  });

  it("con columnas separadas, el cargo resta y el abono suma", () => {
    const grid = parseCSV("Fecha,Concepto,Cargo,Abono\n05/09/2026,Renta,12000,\n06/09/2026,Nomina,,35000");
    const rows = buildRows(grid, { date: 0, description: 1, amount: 2, credit: 3 }, [], { hasHeader: true, dayFirst: true });
    expect(rows[0].kind).toBe("gasto");
    expect(rows[0].amount).toBe(12000);
    expect(rows[1].kind).toBe("ingreso");
    expect(rows[1].amount).toBe(35000);
  });
});

describe("conversión de monedas", () => {
  // Las tasas son MXN → X: cuántos X vale 1 peso.
  const fx = { USD: 0.059, EUR: 0.05068 };
  const cuenta = (id: string, balance: number, currency = "MXN"): Account =>
    ({ id, name: id, balance, currency, icon: "🏦", color: "#000000" });

  it("un saldo en la moneda base no se toca", () => {
    expect(toBase(1000, "MXN", fx)).toBe(1000);
    expect(toBase(1000, "", fx)).toBe(1000);
  });

  it("convierte a pesos dividiendo, no multiplicando", () => {
    // 100 USD con 1 MXN = 0.059 USD → 100 / 0.059 ≈ 1694.92 MXN
    expect(Math.round(toBase(100, "USD", fx))).toBe(1695);
  });

  it("ida y vuelta devuelve el mismo monto", () => {
    const enPesos = toBase(250, "EUR", fx);
    expect(Math.round(fromBase(enPesos, "EUR", fx))).toBe(250);
  });

  it("sin tasa conocida devuelve el monto tal cual, no un invento", () => {
    expect(toBase(500, "JPY", fx)).toBe(500);
    expect(toBase(500, "USD", {})).toBe(500);
  });

  it("detecta si hay cuentas en otra moneda", () => {
    expect(hasForeign([{ currency: "MXN" }, { currency: "USD" }])).toBe(true);
    expect(hasForeign([{ currency: "MXN" }])).toBe(false);
  });

  /**
   * Guardia, no capricho: mientras `Transaction` no guarde su moneda, dejar
   * elegir moneda al crear una cuenta corrompe en silencio gastos, ingresos,
   * presupuestos y la proyección de cierre. Si alguien enciende la bandera sin
   * arreglar eso primero, esta prueba se pone roja y explica por qué.
   */
  it("el selector de moneda sigue apagado mientras las transacciones no guarden moneda", () => {
    expect(SELECTOR_DE_MONEDA_ACTIVO).toBe(false);
  });

  it("el patrimonio consolida las cuentas en otra moneda", () => {
    vi.useFakeTimers(); at("2026-09-15T10:00:00");
    // 1000 MXN + 100 USD (≈1695 MXN) ≈ 2695
    const h = netWorthHistory([cuenta("a", 1000), cuenta("b", 100, "USD")], [], [], 1, new Date(), fx);
    expect(Math.round(h[0].assets)).toBe(2695);
  });
});

describe("avisos descartables", () => {
  beforeEach(() => localStorage.clear());

  it("descartar oculta ese aviso concreto", () => {
    const k = creditAlertKey([{ id: "c1", days: 3 }]);
    expect(isDismissed(k)).toBe(false);
    dismissAlert(k);
    expect(isDismissed(k)).toBe(true);
  });

  it("al llegar el siguiente vencimiento el aviso vuelve solo", () => {
    // Se descarta faltando 3 días; mañana faltan 2 y la clave ya es otra.
    dismissAlert(creditAlertKey([{ id: "c1", days: 3 }]));
    expect(isDismissed(creditAlertKey([{ id: "c1", days: 2 }]))).toBe(false);
  });

  it("un pago vencido insiste aunque se hubiera descartado antes", () => {
    dismissAlert(creditAlertKey([{ id: "c1", days: 1 }]));
    expect(isDismissed(creditAlertKey([{ id: "c1", days: 0 }]))).toBe(false);
    expect(isDismissed(creditAlertKey([{ id: "c1", days: -2 }]))).toBe(false);
  });

  it("otro crédito urgente genera su propio aviso", () => {
    dismissAlert(creditAlertKey([{ id: "c1", days: 3 }]));
    expect(isDismissed(creditAlertKey([{ id: "c1", days: 3 }, { id: "c2", days: 3 }]))).toBe(false);
  });

  it("el orden de los créditos no cambia la clave", () => {
    const a = creditAlertKey([{ id: "c1", days: 3 }, { id: "c2", days: 5 }]);
    const b = creditAlertKey([{ id: "c2", days: 5 }, { id: "c1", days: 3 }]);
    expect(a).toBe(b);
  });

  it("el aviso de presupuesto se reactiva al cambiar de mes", () => {
    const sept = new Date(2026, 8, 15);
    const oct = new Date(2026, 9, 15);
    dismissAlert(budgetAlertKey(["Alimentación"], sept));
    expect(isDismissed(budgetAlertKey(["Alimentación"], sept))).toBe(true);
    expect(isDismissed(budgetAlertKey(["Alimentación"], oct))).toBe(false);
  });

  it("si se pasa otra categoría, vuelve a avisar", () => {
    const hoy = new Date(2026, 8, 15);
    dismissAlert(budgetAlertKey(["Alimentación"], hoy));
    expect(isDismissed(budgetAlertKey(["Alimentación", "Transporte"], hoy))).toBe(false);
  });
});

// ── Plazo de gracia del borrado de cuenta ───────────────────────────────────
describe("diasRestantesDeGracia", () => {
  const pedido = "2026-08-01T12:00:00.000Z";

  it("sin solicitud no hay cuenta regresiva", () => {
    expect(diasRestantesDeGracia(null, 30)).toBe(null);
    expect(diasRestantesDeGracia(undefined, 30)).toBe(null);
  });

  it("recién pedido quedan los 30 días completos", () => {
    expect(diasRestantesDeGracia(pedido, 30, new Date(pedido))).toBe(30);
  });

  it("a la mitad del plazo van quedando los que faltan", () => {
    expect(diasRestantesDeGracia(pedido, 30, new Date("2026-08-16T12:00:00.000Z"))).toBe(15);
  });

  it("redondea hacia arriba para no prometer de menos", () => {
    // Faltan 29 días y 20 horas: decir 29 mataría la cuenta un día antes.
    expect(diasRestantesDeGracia(pedido, 30, new Date("2026-08-01T16:00:00.000Z"))).toBe(30);
    expect(diasRestantesDeGracia(pedido, 30, new Date("2026-08-30T08:00:00.000Z"))).toBe(2);
  });

  it("el último día es 0, que se lee como 'hoy'", () => {
    expect(diasRestantesDeGracia(pedido, 30, new Date("2026-08-31T12:00:00.000Z"))).toBe(0);
  });

  it("pasado el plazo nunca devuelve negativo", () => {
    expect(diasRestantesDeGracia(pedido, 30, new Date("2026-10-15T12:00:00.000Z"))).toBe(0);
  });
});

// ── Textos legales ──────────────────────────────────────────────────────────
// No prueban la redacción, sino lo que hace inválido a un aviso: que le falten
// los datos del responsable, o que el texto y la versión se desincronicen.
describe("legal", () => {
  it("los documentos citan la versión vigente", () => {
    const todo = [...PRIVACIDAD.sections, ...TERMINOS.sections].flatMap((s) => s.body).join(" ");
    expect(todo).toContain(LEGAL_VERSION);
  });

  it("ambos documentos traen contenido", () => {
    for (const doc of [PRIVACIDAD, TERMINOS]) {
      expect(doc.sections.length).toBeGreaterThan(0);
      expect(doc.sections.every((s) => s.body.length > 0)).toBe(true);
    }
  });

  it("el aviso explica el plazo de gracia que de verdad se aplica", () => {
    const todo = [...PRIVACIDAD.sections, ...TERMINOS.sections].flatMap((s) => s.body).join(" ");
    expect(todo).toContain(String(GRACIA_DIAS));
  });

  it("el aviso menciona a los dos encargados que procesan los datos", () => {
    const privacidad = PRIVACIDAD.sections.flatMap((s) => s.body).join(" ");
    expect(privacidad).toContain("Supabase");
    expect(privacidad).toContain("Anthropic");
  });

  // Fue un recordatorio en rojo mientras RESPONSABLE / DOMICILIO / CORREO_ARCO
  // estaban en PENDIENTE. Llenados el 1 de septiembre, ahora monta guardia:
  // sin los tres el aviso vuelve a ser inválido ante la LFPDPPP.
  it("los datos del responsable están llenos", () => {
    expect(LEGAL_INCOMPLETO).toBe(false);
  });

  it("el aviso muestra al responsable, su domicilio y el correo ARCO", () => {
    const privacidad = [PRIVACIDAD.intro, ...PRIVACIDAD.sections.flatMap((s) => s.body)].join(" ");
    expect(privacidad).toContain(RESPONSABLE);
    expect(privacidad).toContain(DOMICILIO);
    expect(privacidad).toContain(CORREO_ARCO);
  });

  // Igual que el anterior: el muro de fin de prueba sin precio ni contacto es
  // un callejón sin salida. Se pone verde al llenar los dos valores.
  it.fails("el precio y el contacto de cobro ya están llenos", () => {
    expect(COBRO_INCOMPLETO).toBe(false);
  });

  it("los términos dicen los días de prueba que de verdad se aplican", () => {
    const t = TERMINOS.sections.flatMap((s) => s.body).join(" ");
    expect(t).toContain(String(PRUEBA_DIAS));
  });

  /**
   * El texto anterior prometía que al no continuar se limitaban "únicamente
   * las funciones del asistente". Con muro de pago eso era falso, y cobrar
   * contra unos términos que dicen otra cosa es el problema caro.
   */
  it("los términos ya no prometen que solo se limita el asistente", () => {
    const t = TERMINOS.sections.flatMap((s) => s.body).join(" ");
    expect(t).not.toContain("únicamente las funciones del asistente");
  });

  it("los términos prometen exportar y borrar aunque no se continúe", () => {
    const t = TERMINOS.sections.flatMap((s) => s.body).join(" ").toLowerCase();
    expect(t).toContain("exportar");
    expect(t).toContain("borrar tu cuenta");
  });
});

// ============================================================================
// El plazo de la prueba: decide el día exacto en que la app se cierra.
// ============================================================================
describe("diasRestantesDePlazo", () => {
  const alta = "2026-09-01T12:00:00Z";

  it("el día del alta quedan los 30 completos", () => {
    expect(diasRestantesDePlazo(alta, 30, new Date("2026-09-01T12:00:00Z"))).toBe(30);
  });

  it("a mitad del plazo quedan los que faltan", () => {
    expect(diasRestantesDePlazo(alta, 30, new Date("2026-09-21T12:00:00Z"))).toBe(10);
  });

  it("el último día todavía no vence: 1, no 0", () => {
    // Con floor en vez de ceil, la app se habría cerrado un día antes de lo
    // que dicen los términos.
    expect(diasRestantesDePlazo(alta, 30, new Date("2026-09-30T18:00:00Z"))).toBe(1);
  });

  it("cumplido el plazo es 0, que es lo que levanta el muro", () => {
    expect(diasRestantesDePlazo(alta, 30, new Date("2026-10-01T12:00:00Z"))).toBe(0);
  });

  it("pasado el plazo nunca es negativo", () => {
    expect(diasRestantesDePlazo(alta, 30, new Date("2027-03-01T12:00:00Z"))).toBe(0);
  });

  it("sin fecha de alta no hay plazo que contar", () => {
    expect(diasRestantesDePlazo(null, 30)).toBe(null);
  });
});

// ============================================================================
// Resolver un nombre de cuenta: es lo que decide de dónde sale el dinero.
// ============================================================================
describe("findByName", () => {
  const cuentas = [
    { name: "BBVA Oro" },
    { name: "BBVA" },
    { name: "Efectivo" },
  ];

  it("prefiere la coincidencia exacta aunque otra la contenga", () => {
    // Con `includes` a secas, "BBVA" caía en "BBVA Oro" por venir primero:
    // el gasto se cargaba a la cuenta equivocada sin avisar.
    expect(findByName(cuentas, "BBVA", "la cuenta").name).toBe("BBVA");
  });

  it("acepta una parcial cuando no hay duda", () => {
    expect(findByName(cuentas, "efec", "la cuenta").name).toBe("Efectivo");
  });

  it("el match es en los dos sentidos: 'cuenta Efectivo' encuentra 'Efectivo'", () => {
    // El modelo suele decir de más ("mi cuenta Efectivo"), y el nombre real
    // está contenido en lo dicho, no al revés.
    expect(findByName(cuentas, "mi Efectivo", "la cuenta").name).toBe("Efectivo");
  });

  it("falla si el nombre coincide con varias, en vez de elegir por su cuenta", () => {
    expect(() => findByName([{ name: "Nu Débito" }, { name: "Nu Crédito" }], "Nu", "la cuenta"))
      .toThrow(/coincide con varios/);
    // Consecuencia del match bidireccional: "bbva o" contiene "BBVA" y a la vez
    // está contenido en "BBVA Oro". Con dos candidatos, pregunta.
    expect(() => findByName(cuentas, "bbva o", "la cuenta")).toThrow(/coincide con varios/);
  });

  it("dice qué cuentas hay cuando no encuentra ninguna", () => {
    expect(() => findByName(cuentas, "Santander", "la cuenta")).toThrow(/BBVA Oro, BBVA, Efectivo/);
  });

  it("un nombre vacío no se resuelve al azar", () => {
    // Cadena vacía: `includes("")` es true para todas, así que sin la guarda
    // de ambigüedad se habría quedado con la primera de la lista.
    expect(() => findByName(cuentas, "", "la cuenta")).toThrow();
  });
});

// ── Arranque guiado ─────────────────────────────────────────────────────────
// Lo que se prueba no es la redacción sino la promesa del arranque: que la
// pantalla de cierre repita lo que la persona de verdad contestó, y que no
// invente nada cuando no contestó. Un "bienvenido" genérico disfrazado de
// personalizado es peor que no tener arranque.
describe("arranque guiado", () => {
  const lleno: Respuestas = {
    goal: "salir_deudas",
    pains: ["fechas_pago", "varias_tarjetas"],
    current_tool: "en_mi_cabeza",
    dream: "Dormir sin pensar en la quincena",
    source: "tiktok",
  };

  it("el cuestionario guarda cada respuesta en un campo distinto", () => {
    const campos = PREGUNTAS.map((p) => p.field);
    expect(new Set(campos).size).toBe(campos.length);
  });

  it("'cómo llegaste' va al final: es la única administrativa", () => {
    expect(PREGUNTAS[PREGUNTAS.length - 1].field).toBe("source");
  });

  it("toda opción trae llave, y las llaves no se repiten dentro de su pregunta", () => {
    for (const p of PREGUNTAS) {
      const keys = (p.options ?? []).map((o) => o.key);
      expect(keys.every((k) => k.length > 0)).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
      // Solo la de texto libre puede no traer opciones.
      if (p.kind !== "texto") expect(keys.length).toBeGreaterThan(1);
    }
  });

  it("el cierre saluda por nombre y responde a la meta y al primer dolor", () => {
    const b = bienvenida("Jeshua", lleno);
    expect(b.titulo).toContain("Jeshua");
    const todo = b.parrafos.join(" ");
    expect(todo).toContain("tarjeta mexicana");   // viene de goal
    expect(todo).toContain("corte");              // viene del primer dolor
  });

  it("le devuelve su respuesta abierta tal como la escribió", () => {
    const b = bienvenida("Ana", lleno);
    expect(b.parrafos.join("\n")).toContain("Dormir sin pensar en la quincena");
  });

  it("contesta un solo dolor, no los seis: es una felicitación, no un folleto", () => {
    const b = bienvenida("Ana", { ...lleno, pains: ["fechas_pago", "varias_tarjetas", "gasto_mas"] });
    const menciones = b.parrafos.filter((t) => t.startsWith("Nos dijiste"));
    expect(menciones.length).toBe(1);
  });

  it("sin respuestas no inventa: solo felicita y dice cómo empezar", () => {
    const b = bienvenida("Ana", RESPUESTAS_VACIAS);
    const todo = b.parrafos.join(" ");
    expect(todo).not.toContain("Nos dijiste");
    expect(todo).not.toContain("undefined");
    expect(b.parrafos.length).toBeGreaterThanOrEqual(2);
  });

  it("una respuesta abierta en blanco no pinta el párrafo de la cita", () => {
    const conCita = bienvenida("Ana", lleno).parrafos.filter((t) => t.startsWith("Y esto que escribiste"));
    expect(conCita.length).toBe(1);
    const enBlanco = bienvenida("Ana", { ...lleno, dream: "   " }).parrafos.filter((t) => t.startsWith("Y esto que escribiste"));
    expect(enBlanco.length).toBe(0);
  });

  it("el contexto del asesor traduce las llaves a lenguaje natural", () => {
    const ctx = contextoParaAsesor(lleno);
    expect(ctx).toContain("salir de deudas");
    expect(ctx).toContain("Dormir sin pensar en la quincena");
    // Las llaves internas no deben filtrarse al prompt.
    expect(ctx).not.toContain("salir_deudas");
    expect(ctx).not.toContain("fechas_pago");
  });

  it("sin arranque contestado el asesor no recibe una sección vacía", () => {
    expect(contextoParaAsesor(RESPUESTAS_VACIAS)).toBe("");
    expect(contextoParaAsesor({})).toBe("");
  });

  it("una llave desconocida se ignora en vez de romper el mensaje", () => {
    const b = bienvenida("Ana", { ...RESPUESTAS_VACIAS, goal: "inventada", pains: ["tampoco_existe"] });
    const todo = b.parrafos.join(" ");
    expect(todo).not.toContain("undefined");
    expect(contextoParaAsesor({ goal: "inventada", pains: ["tampoco_existe"] })).toBe("");
  });
});

describe("consultas de IA restantes", () => {
  it("resta lo usado del tope que manda el servidor", () => {
    expect(consultasRestantes({ hoy: 3, tope: 15 })).toBe(12);
    expect(consultasRestantes({ hoy: 0, tope: 15 })).toBe(15);
  });

  it("nunca dice un número negativo, aunque el tope haya bajado a media jornada", () => {
    expect(consultasRestantes({ hoy: 20, tope: 15 })).toBe(0);
  });

  it("sin datos no inventa nada", () => {
    expect(textoAiUso(null)).toBeNull();
  });

  it("avisa cuando se acabaron y cuenta en singular la última", () => {
    expect(textoAiUso({ hoy: 15, tope: 15 })).toEqual({ texto: "Se acabaron las consultas de hoy. Mañana se renuevan.", agotado: true });
    expect(textoAiUso({ hoy: 14, tope: 15 })).toEqual({ texto: "Te queda 1 consulta de IA hoy, de 15.", agotado: false });
    expect(textoAiUso({ hoy: 3, tope: 15 })).toEqual({ texto: "Te quedan 12 consultas de IA hoy, de 15.", agotado: false });
  });
});
