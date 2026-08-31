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

await admin.auth.admin.deleteUser(cu.user.id);
console.log("\n✅ Idempotencia verificada: reintentar no duplica ni el movimiento ni el saldo.");
process.exit(0);
