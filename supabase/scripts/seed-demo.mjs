// ============================================================================
// Cuenta demo para el revisor de Apple y Google.
//
// El registro está cerrado; sin credenciales de prueba, Apple rechaza la app
// (guía 2.1). Este script crea (o rehace) una cuenta con tres meses de datos
// creíbles: cuentas, una tarjeta con corte y pago, nómina y renta fijas,
// presupuestos, una meta y ~45 movimientos.
//
// Es idempotente: si la cuenta existe, se borra y se vuelve a crear desde
// cero, así el revisor siempre la encuentra limpia. Salta el portón legal y
// el arranque guiado porque el revisor no viene a leer un aviso mexicano.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... DEMO_EMAIL=... DEMO_PASSWORD=... \
//   node supabase/scripts/seed-demo.mjs
//
// La contraseña la eliges tú y va en el formulario de revisión; aquí no se
// guarda en ningún lado.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// La versión vigente del aviso, leída del código: si cambia, la demo no debe
// toparse con el portón legal. Node no importa .ts, por eso se lee como texto.
const LEGAL_VERSION = readFileSync(new URL("../../src/lib/legal.ts", import.meta.url), "utf8").match(/LEGAL_VERSION = "([^"]+)"/)[1];

const SB_URL = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
if (!SB_URL || !SK || !EMAIL || !PASSWORD) {
  console.error("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY / DEMO_EMAIL / DEMO_PASSWORD");
  process.exit(1);
}
if (PASSWORD.length < 8) { console.error("DEMO_PASSWORD: mínimo 8 caracteres (es lo que exige el registro)"); process.exit(1); }

const admin = createClient(SB_URL, SK, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (s, e) => { console.error("✗", s, e?.message ?? e); process.exit(1); };

// ── 1. La cuenta, desde cero ─────────────────────────────────────────────────
const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of lista.users.filter((u) => u.email === EMAIL)) await admin.auth.admin.deleteUser(u.id);
const { data: cu, error: cuErr } = await admin.auth.admin.createUser({
  email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { name: "Demo" },
});
if (cuErr) die("createUser", cuErr);
const uid = cu.user.id;

// Sin portón legal ni arranque: la constancia la sella el servidor, pero aquí
// la pone el administrador a propósito, es una cuenta de prueba.
const { error: pErr } = await admin.from("profiles").update({
  name: "Demo", legal_version: LEGAL_VERSION,
  legal_accepted_at: new Date().toISOString(), onboarded_at: new Date().toISOString(),
}).eq("id", uid);
if (pErr) die("profile", pErr);
await admin.from("user_survey").upsert({ user_id: uid, goal: "saber_gastos", pains: ["fechas_pago"], current_tool: "excel", dream: "Saber en qué se va el dinero sin hacer cuentas a mano", source: "otro", completed: true }, { onConflict: "user_id" });

// ── 2. Categorías (las siembra el trigger de alta) ──────────────────────────
const { data: cats } = await admin.from("categories").select("id,name").eq("user_id", uid);
const cat = (n) => cats.find((c) => c.name === n)?.id ?? null;

// ── 3. Cuentas, crédito, fijos, presupuestos y meta ─────────────────────────
const { data: accs, error: aErr } = await admin.from("accounts").insert([
  { user_id: uid, name: "BBVA", balance: 0, icon: "🏦", color: "#00b1ea" },
  { user_id: uid, name: "Efectivo", balance: 0, icon: "💵", color: "#34d399" },
  { user_id: uid, name: "Nu", balance: 0, icon: "💜", color: "#a78bfa" },
]).select();
if (aErr) die("accounts", aErr);
const acc = (n) => accs.find((a) => a.name === n).id;

const hoy = new Date();
const y = hoy.getFullYear(), m = hoy.getMonth();
const dia = (d, mesOffset = 0, h = 12) => new Date(y, m + mesOffset, d, h).toISOString();
const dateOnly = (d, mesOffset = 0) => { const x = new Date(y, m + mesOffset, d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

const { error: cErr } = await admin.from("credits").insert({
  user_id: uid, name: "BBVA Azul", type: "tarjeta", institution: "BBVA", total_debt: 8450, credit_limit: 40000,
  monthly_payment: 2500, cut_day: 12, payment_day: 2, next_payment_date: null, interest_rate: 48,
});
if (cErr) die("credit", cErr);

const { error: rErr } = await admin.from("recurring_rules").insert([
  { user_id: uid, name: "Nómina", kind: "ingreso", amount: 18500, account_id: acc("BBVA"), category_id: cat("Nómina"), frequency: "mensual", next_run: dateOnly(1, 1), active: true },
  { user_id: uid, name: "Renta", kind: "gasto", amount: 7200, account_id: acc("BBVA"), category_id: cat("Servicios"), frequency: "mensual", next_run: dateOnly(5, hoy.getDate() >= 5 ? 1 : 0), active: true },
  { user_id: uid, name: "Spotify", kind: "gasto", amount: 129, account_id: acc("Nu"), category_id: cat("Entretenimiento"), frequency: "mensual", next_run: dateOnly(18, hoy.getDate() >= 18 ? 1 : 0), active: true },
]);
if (rErr) die("recurring", rErr);

const { error: bErr } = await admin.from("budgets").insert([
  { user_id: uid, category_id: cat("Alimentación"), period: "mensual", amount: 6000, rollover: false },
  { user_id: uid, category_id: cat("Transporte"), period: "mensual", amount: 1800, rollover: true },
  { user_id: uid, category_id: cat("Entretenimiento"), period: "mensual", amount: 1200, rollover: false },
]);
if (bErr) die("budgets", bErr);
await admin.from("profiles").update({ monthly_budget: 16000 }).eq("id", uid);

const { error: gErr } = await admin.from("goals").insert({
  user_id: uid, name: "Fondo de emergencia", target_amount: 30000, current_amount: 11200, icon: "🛡️", color: "#10b981", target_date: dateOnly(28, 4),
});
if (gErr) die("goal", gErr);

// ── 4. Tres meses de movimientos, creíbles y con variedad ───────────────────
const mov = [];
const g = (a, cantidad, desc, c, d, mo, h = 12) => mov.push({ user_id: uid, account_id: acc(a), kind: "gasto", amount: cantidad, description: desc, category_id: cat(c), date: dia(d, mo, h) });
const i = (a, cantidad, desc, c, d, mo) => mov.push({ user_id: uid, account_id: acc(a), kind: "ingreso", amount: cantidad, description: desc, category_id: cat(c), date: dia(d, mo, 9) });
for (const mo of [-2, -1, 0]) {
  i("BBVA", 18500, "Nómina", "Nómina", 1, mo);
  g("BBVA", 7200, "Renta", "Servicios", 5, mo, 8);
  g("BBVA", 1380, "Luz CFE", "Servicios", 8, mo);
  g("Nu", 129, "Spotify", "Entretenimiento", 18, mo);
  g("BBVA", 1450, "Súper Ley", "Alimentación", 3, mo, 19);
  g("Efectivo", 180, "Tacos", "Alimentación", 6, mo, 21);
  g("BBVA", 620, "Gasolina", "Transporte", 7, mo);
  g("BBVA", 1620, "Súper Ley", "Alimentación", 14, mo, 18);
  g("Nu", 249, "Uber", "Transporte", 15, mo, 23);
  g("Efectivo", 95, "Café", "Alimentación", 16, mo, 8);
  g("BBVA", 890, "Farmacia", "Salud", 19, mo);
  g("Nu", 1250, "Ropa", "Compras", 21, mo, 17);
  g("BBVA", 640, "Gasolina", "Transporte", 22, mo);
  g("Efectivo", 320, "Cena con amigos", "Entretenimiento", 24, mo, 22);
  g("BBVA", 1390, "Súper Ley", "Alimentación", 26, mo, 18);
  if (mo !== 0) i("Efectivo", 1500, "Venta de bici", "Ventas", 20, mo);
}
const movs = mov.filter((x) => new Date(x.date) <= hoy);
const { error: tErr } = await admin.from("transactions").insert(movs);
if (tErr) die("transactions", tErr);

// ── 5. Saldos coherentes con los movimientos (saldo inicial + suma) ─────────
const inicial = { BBVA: 12000, Efectivo: 900, Nu: 7500 };
for (const a of accs) {
  const delta = movs.filter((x) => x.account_id === a.id).reduce((s, x) => s + (x.kind === "ingreso" ? x.amount : -x.amount), 0);
  await admin.from("accounts").update({ balance: inicial[a.name] + delta }).eq("id", a.id);
}

console.log(`✅ Cuenta demo lista: ${EMAIL} · ${movs.length} movimientos, 3 cuentas, 1 tarjeta, 3 fijos, 3 presupuestos, 1 meta`);
console.log("   La contraseña es la que pusiste en DEMO_PASSWORD. Va en el formulario de revisión, no en el repo.");
process.exit(0);
