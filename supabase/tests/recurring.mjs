// ============================================================================
// Verifica el motor de recurrentes contra el proyecto real:
// - genera las ocurrencias vencidas (ponerse al corriente tras días sin correr)
// - ajusta el saldo por cada una
// - avanza next_run al futuro y no vuelve a generar si se corre de nuevo
// - el usuario autenticado NO puede disparar el generador
//
// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... node supabase/tests/recurring.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const SK = process.env.SUPABASE_SECRET_KEY;
if (!URL || !PK || !SK) { console.error("Faltan variables de entorno"); process.exit(1); }

const admin = createClient(URL, SK, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (s, e) => { console.error("✗", s, e?.message ?? e); process.exit(1); };
const eq = (label, got, want) => { if (String(got) !== String(want)) die(label, `${got} ≠ ${want}`); console.log(`  ✓ ${label}: ${got}`); };

const email = "recurring-test@millions.local", password = "rec-Test-123!";
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of list.users.filter((u) => u.email === email)) await admin.auth.admin.deleteUser(u.id);
const { data: cu, error: cuErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (cuErr) die("createUser", cuErr);
const uid = cu.user.id;

const sb = createClient(URL, PK, { auth: { persistSession: false } });
const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
if (siErr) die("signIn", siErr);

const { data: acc } = await sb.from("accounts").insert({ user_id: uid, name: "Nomina", balance: 0 }).select().single();
const { data: cats } = await sb.from("categories").select("id,name");

// Regla mensual con dos meses de atraso: al correr debe generar 3 (hace 2 meses,
// hace 1 mes y este mes) y dejar next_run el mes que viene.
const hace2Meses = new Date();
hace2Meses.setMonth(hace2Meses.getMonth() - 2);
const nextRun = hace2Meses.toISOString().slice(0, 10);

const { data: rule, error: rErr } = await sb.from("recurring_rules").insert({
  user_id: uid, name: "Renta", kind: "gasto", amount: 8000,
  account_id: acc.id, category_id: cats.find((c) => c.name === "Servicios").id,
  frequency: "mensual", next_run: nextRun,
}).select().single();
if (rErr) die("crear regla", rErr);
console.log(`\n── Regla "Renta" $8,000 mensual, atrasada desde ${nextRun} ──`);

// El usuario autenticado no debe poder dispararlo
const { error: denied } = await sb.rpc("run_recurring_rules");
console.log(`  ✓ usuario autenticado no puede ejecutarlo: ${denied ? "rechazado" : "¡PERMITIDO!"}`);
if (!denied) die("permisos", "authenticated pudo ejecutar run_recurring_rules");

// El backend sí
const { data: generadas, error: runErr } = await admin.rpc("run_recurring_rules");
if (runErr) die("run_recurring_rules", runErr);
console.log(`\n── Primera corrida ──`);
eq("ocurrencias generadas", generadas, 3);

const { data: txs } = await sb.from("transactions").select("amount,date,kind,recurring_id").order("date");
eq("transacciones en la cuenta", txs.length, 3);
eq("todas ligadas a la regla", txs.every((t) => t.recurring_id === rule.id), true);
const saldo = Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance);
eq("saldo (3 × -8000)", saldo, -24000);

const { data: ruleAfter } = await sb.from("recurring_rules").select("next_run,last_run").eq("id", rule.id).single();
const futuro = new Date(ruleAfter.next_run) > new Date();
eq("next_run quedó en el futuro", futuro, true);
console.log(`  ✓ próxima ejecución: ${ruleAfter.next_run}`);

// Correr de nuevo el mismo día no debe duplicar nada
const { data: segunda } = await admin.rpc("run_recurring_rules");
console.log(`\n── Segunda corrida el mismo día ──`);
eq("ocurrencias generadas", segunda, 0);
const saldo2 = Number((await sb.from("accounts").select("balance").eq("id", acc.id).single()).data.balance);
eq("saldo sin cambios", saldo2, -24000);

// Una regla pausada no genera nada
await sb.from("recurring_rules").update({ active: false, next_run: new Date().toISOString().slice(0, 10) }).eq("id", rule.id);
const { data: tercera } = await admin.rpc("run_recurring_rules");
console.log(`\n── Regla pausada ──`);
eq("ocurrencias generadas", tercera, 0);

await admin.auth.admin.deleteUser(uid);
console.log("\n✅ Recurrentes verificados: se pone al corriente, no duplica y respeta la pausa.");
process.exit(0);
