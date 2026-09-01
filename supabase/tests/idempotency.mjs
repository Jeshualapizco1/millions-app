// ============================================================================
// La cola offline reintenta lo que no pudo enviar. Si el servidor SÍ recibió
// el original y solo se perdió la respuesta, el reintento no debe duplicar
// nada. Esto lo verifica contra el proyecto real.
//
// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... node supabase/tests/idempotency.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.SUPABASE_URL, PK = process.env.SUPABASE_PUBLISHABLE_KEY, SK = process.env.SUPABASE_SECRET_KEY;
if (!URL || !PK || !SK) { console.error("Faltan variables de entorno"); process.exit(1); }
const admin = createClient(URL, SK, { auth: { persistSession: false } });
const die = (m) => { console.error("✗", m); process.exit(1); };
const eq = (l, got, want) => { if (String(got) !== String(want)) die(`${l}: ${got} ≠ ${want}`); console.log(`  ✓ ${l}: ${got}`); };

const email = "idem-test@millions.local", password = "idem-Test-123!";
const { data: l } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of l.users.filter((u) => u.email === email)) await admin.auth.admin.deleteUser(u.id);
const { data: cu } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const sb = createClient(URL, PK, { auth: { persistSession: false } });
await sb.auth.signInWithPassword({ email, password });

const { data: acc } = await sb.from("accounts").insert({ user_id: cu.user.id, name: "Banco", balance: 10000 }).select().single();
const clientId = randomUUID();
const args = { p_account_id: acc.id, p_kind: "gasto", p_amount: 250, p_description: "tacos", p_client_id: clientId };

console.log("\n── Primer envío ──");
const { error: e1 } = await sb.rpc("apply_transaction", args);
if (e1) die("primer envío: " + e1.message);
eq("saldo", Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance), 9750);

console.log("\n── Reintento con el MISMO id (respuesta perdida) ──");
const { error: e2 } = await sb.rpc("apply_transaction", args);
if (e2) die("reintento: " + e2.message);
eq("transacciones", (await sb.from("transactions").select("id", { count: "exact", head: true })).count, 1);
eq("saldo sin doble cargo", Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance), 9750);

console.log("\n── Tercer y cuarto reintento ──");
await sb.rpc("apply_transaction", args);
await sb.rpc("apply_transaction", args);
eq("transacciones", (await sb.from("transactions").select("id", { count: "exact", head: true })).count, 1);
eq("saldo", Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance), 9750);

console.log("\n── Un movimiento distinto sí entra ──");
await sb.rpc("apply_transaction", { ...args, p_client_id: randomUUID(), p_amount: 100, p_description: "cafe" });
eq("transacciones", (await sb.from("transactions").select("id", { count: "exact", head: true })).count, 2);
eq("saldo", Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance), 9650);

console.log("\n── Importar el mismo lote dos veces (migración 0022) ──");
const lote = [
  { id: randomUUID(), account_id: acc.id, kind: "gasto", amount: 200, description: "Luz", date: "2026-08-10" },
  { id: randomUUID(), account_id: acc.id, kind: "ingreso", amount: 1000, description: "Venta", date: "2026-08-11T18:00:00Z" },
];
const { data: n1, error: i1 } = await sb.rpc("import_transactions", { p_rows: lote });
if (i1) die(`import 1: ${i1.message}`);
eq("primera importación entra", n1, 2);
eq("saldo tras importar", Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance), 10450);
const { data: n2, error: i2 } = await sb.rpc("import_transactions", { p_rows: lote });
if (i2) die(`import 2: ${i2.message}`);
eq("el reintento no inserta nada", n2, 0);
eq("transacciones", (await sb.from("transactions").select("id", { count: "exact", head: true })).count, 4);
eq("saldo intacto", Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance), 10450);
// la fecha sin hora quedó al mediodía de Mazatlán (19:00Z)
const { data: luz } = await sb.from("transactions").select("date").eq("description", "Luz").single();
eq("fecha sin hora al mediodía local", luz.date.slice(0, 16), "2026-08-10T19:00");

await admin.auth.admin.deleteUser(cu.user.id);
console.log("\n✅ Idempotencia verificada: reintentar no duplica ni el movimiento ni el saldo, tampoco al importar.");
process.exit(0);
