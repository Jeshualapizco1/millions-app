// ============================================================================
// Millions v2 — importa el snapshot al proyecto nuevo de Supabase.
//
// Uso:
//   NEW_SUPABASE_URL=https://xxxx.supabase.co \
//   NEW_SERVICE_ROLE_KEY=eyJ... \
//   node migration/import.mjs [--dry-run]
//
// Idempotente: busca por email/nombre antes de crear; se puede correr N veces.
// Al final verifica los checksums del snapshot centavo por centavo.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SNAPSHOT = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "snapshot-2026-08-30.json"), "utf8"));
const URL = process.env.NEW_SUPABASE_URL;
const KEY = process.env.NEW_SERVICE_ROLE_KEY;
const DRY = process.argv.includes("--dry-run");
if (!URL || !KEY) { console.error("Faltan NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY"); process.exit(1); }

const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (step, error) => { console.error(`✗ ${step}:`, error.message ?? error); process.exit(1); };
const money = (n) => Math.round(Number(n) * 100) / 100;

// ── 1. Usuario con datos (solo la cuenta de gmail; el resto se invita) ──────
const owner = SNAPSHOT.users.find((u) => u.has_data);
console.log(`Usuario a migrar: ${owner.email}`);

let newUserId;
{
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (error) die("listUsers", error);
  const existing = data.users.find((u) => u.email === owner.email);
  if (existing) {
    newUserId = existing.id;
    console.log(`  ya existe en el proyecto nuevo → ${newUserId}`);
  } else if (DRY) {
    newUserId = "(dry-run)";
    console.log("  [dry-run] se crearía con invitación por correo");
  } else {
    // Invitación: el usuario define su contraseña desde el correo.
    const { data: inv, error: invErr } = await sb.auth.admin.inviteUserByEmail(owner.email, {
      data: { name: owner.name },
    });
    if (invErr) die("inviteUserByEmail", invErr);
    newUserId = inv.user.id;
    console.log(`  invitado → ${newUserId}`);
  }
}

if (DRY) {
  console.log(`\n[dry-run] Se importarían: ${SNAPSHOT.accounts.length} cuentas, ${SNAPSHOT.transactions.length} transacciones, ${SNAPSHOT.credits.length} créditos.`);
  process.exit(0);
}

// ── 2. Categorías del usuario (las siembra el trigger handle_new_user) ──────
const { data: cats, error: catErr } = await sb.from("categories").select("id,name").eq("user_id", newUserId);
if (catErr) die("categories", catErr);
if (!cats.length) die("categories", new Error("El trigger handle_new_user no sembró categorías — ¿se aplicó 0001_schema.sql?"));
const catByName = Object.fromEntries(cats.map((c) => [c.name, c.id]));

// ── 3. Cuentas (mismos ids que el snapshot para conservar referencias) ──────
for (const a of SNAPSHOT.accounts) {
  const { error } = await sb.from("accounts").upsert({
    id: a.id, user_id: newUserId, name: a.name, balance: a.balance,
    icon: a.icon, color: a.color, created_at: a.created_at,
  });
  if (error) die(`account ${a.name}`, error);
}
console.log(`✓ ${SNAPSHOT.accounts.length} cuentas`);

// ── 4. Transacciones (type → kind; category nombre → category_id) ───────────
for (const t of SNAPSHOT.transactions) {
  if (!t.account_id) die(`tx ${t.id}`, new Error("transacción sin cuenta — resolver a mano"));
  const { error } = await sb.from("transactions").upsert({
    id: t.id, user_id: newUserId, account_id: t.account_id,
    kind: t.type, // gasto|ingreso. (Las "Transferencia" del snapshot son pagos a terceros: siguen siendo gastos.)
    amount: t.amount, description: t.description,
    category_id: catByName[t.category] ?? catByName["Otros"],
    date: t.date, created_at: t.date,
  });
  if (error) die(`tx ${t.description}`, error);
}
console.log(`✓ ${SNAPSHOT.transactions.length} transacciones`);

// ── 5. Créditos ─────────────────────────────────────────────────────────────
for (const c of SNAPSHOT.credits) {
  const { error } = await sb.from("credits").upsert({
    id: c.id, user_id: newUserId, name: c.name, type: c.type,
    institution: c.institution, total_debt: c.total_debt, credit_limit: c.credit_limit,
    monthly_payment: c.monthly_payment, cut_day: c.cut_day, payment_day: c.payment_day,
    next_payment_date: c.next_payment_date, interest_rate: c.interest_rate,
    notes: c.notes, created_at: c.created_at,
  });
  if (error) die(`credit ${c.name}`, error);
}
console.log(`✓ ${SNAPSHOT.credits.length} créditos`);

// ── 6. Checksums ────────────────────────────────────────────────────────────
const { data: accs } = await sb.from("accounts").select("balance").eq("user_id", newUserId);
const { data: txs } = await sb.from("transactions").select("amount").eq("user_id", newUserId);
const { data: crs } = await sb.from("credits").select("total_debt").eq("user_id", newUserId);
const got = {
  accounts_total_balance: money(accs.reduce((s, a) => s + Number(a.balance), 0)),
  transactions_count: txs.length,
  transactions_total_amount: money(txs.reduce((s, t) => s + Number(t.amount), 0)),
  credits_total_debt: money(crs.reduce((s, c) => s + Number(c.total_debt), 0)),
};
let ok = true;
for (const [k, expected] of Object.entries(SNAPSHOT.checksums)) {
  const match = got[k] === expected;
  ok &&= match;
  console.log(`${match ? "✓" : "✗"} ${k}: ${got[k]} (esperado ${expected})`);
}
if (!ok) { console.error("\nCHECKSUM FALLÓ — no hacer el corte."); process.exit(1); }
console.log("\n✅ Importación verificada centavo por centavo.");
