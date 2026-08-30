// ============================================================================
// Smoke test E2E contra el proyecto real: usuario desechable, el contrato
// exacto del frontend (login con publishable key, RLS, SELECT con joins,
// RPC apply+reverse) y aislamiento entre usuarios. Limpia todo al final.
//
// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... node supabase/tests/e2e.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const SK = process.env.SUPABASE_SECRET_KEY;
if (!URL || !PK || !SK) { console.error("Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY"); process.exit(1); }

const admin = createClient(URL, SK, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (s, e) => { console.error("✗", s, e?.message ?? e); process.exit(1); };

// 1. usuario desechable (el trigger siembra perfil + categorías)
const email = "e2e-test@millions.local";
const password = "e2e-Pass-123!";
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of list.users.filter((u) => u.email === email)) await admin.auth.admin.deleteUser(u.id);
const { data: cu, error: cuErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (cuErr) die("createUser", cuErr);
const uid = cu.user.id;

// 2. login como lo hace la app (publishable key + password)
const sb = createClient(URL, PK, { auth: { persistSession: false } });
const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
if (siErr) die("signIn", siErr);

// 3. categorías sembradas visibles bajo RLS
const { data: cats, error: cErr } = await sb.from("categories").select("id,name").order("sort_order");
if (cErr) die("categories", cErr);
if (cats.length !== 11) die("categories", `esperaba 11, hay ${cats.length}`);

// 4. cuenta + RPC apply + el SELECT exacto del frontend (joins)
const { data: acc, error: aErr } = await sb.from("accounts").insert({ user_id: uid, name: "Prueba", balance: 1000 }).select().single();
if (aErr) die("insert account", aErr);
const catId = cats.find((c) => c.name === "Alimentación").id;
const { data: tx, error: tErr } = await sb.rpc("apply_transaction", { p_account_id: acc.id, p_kind: "gasto", p_amount: 250, p_description: "tacos", p_category_id: catId });
if (tErr) die("apply_transaction", tErr);
const { data: rows, error: qErr } = await sb
  .from("transactions")
  .select("*, account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name), category:categories(name)")
  .order("date", { ascending: false });
if (qErr) die("select joins", qErr);
if (rows[0]?.account?.name !== "Prueba" || rows[0]?.category?.name !== "Alimentación") die("joins", JSON.stringify(rows[0]).slice(0, 200));
const { data: accAfter } = await sb.from("accounts").select("balance").eq("id", acc.id).single();
if (Number(accAfter.balance) !== 750) die("balance", accAfter.balance);

// 5. reverse deja todo como estaba
const { error: rErr } = await sb.rpc("reverse_transaction", { p_id: tx.id });
if (rErr) die("reverse", rErr);
const { data: accFinal } = await sb.from("accounts").select("balance").eq("id", acc.id).single();
if (Number(accFinal.balance) !== 1000) die("balance tras reverse", accFinal.balance);

// 6. el usuario de prueba NO ve los datos de otros usuarios
const { count } = await sb.from("transactions").select("id", { count: "exact", head: true });
if (count !== 0) die("aislamiento RLS", `ve ${count} transacciones ajenas`);

// 7. limpieza total (cascade borra cuenta/perfil/categorías)
await admin.auth.admin.deleteUser(uid);
console.log("✅ E2E OK: login, RLS, joins del frontend, apply+reverse con saldos exactos, aislamiento entre usuarios");
process.exit(0);
