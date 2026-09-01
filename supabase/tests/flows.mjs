// ============================================================================
// Verifica los flujos de dinero de la Fase 5 contra el proyecto real, con un
// usuario desechable: transferencia, pago de crédito, abono a meta desde
// cuenta, edición y reversión. Cada paso comprueba saldos exactos.
//
// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... node supabase/tests/flows.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const SK = process.env.SUPABASE_SECRET_KEY;
if (!URL || !PK || !SK) { console.error("Faltan variables de entorno"); process.exit(1); }

const admin = createClient(URL, SK, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (s, e) => { console.error("✗", s, e?.message ?? e); process.exit(1); };
const email = "flows-test@millions.local", password = "flows-Test-123!";

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of list.users.filter((u) => u.email === email)) await admin.auth.admin.deleteUser(u.id);
const { data: cu, error: cuErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (cuErr) die("createUser", cuErr);
const uid = cu.user.id;

const sb = createClient(URL, PK, { auth: { persistSession: false } });
const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
if (siErr) die("signIn", siErr);

const bal = async (id) => Number((await sb.from("accounts").select("balance").eq("id", id).single()).data.balance);
const debtOf = async (id) => Number((await sb.from("credits").select("total_debt").eq("id", id).single()).data.total_debt);
const goalOf = async (id) => Number((await sb.from("goals").select("current_amount").eq("id", id).single()).data.current_amount);
const eq = (label, got, want) => { if (Math.abs(got - want) > 0.001) die(label, `${got} ≠ ${want}`); console.log(`  ✓ ${label}: ${got}`); };

// Datos base
const { data: a1 } = await sb.from("accounts").insert({ user_id: uid, name: "Banco", balance: 10000 }).select().single();
const { data: a2 } = await sb.from("accounts").insert({ user_id: uid, name: "Efectivo", balance: 2000 }).select().single();
const { data: cr } = await sb.from("credits").insert({ user_id: uid, name: "Tarjeta", type: "tarjeta", total_debt: 3000, next_payment_date: "2030-01-15" }).select().single();
const nextPayOf = async (id) => (await sb.from("credits").select("next_payment_date").eq("id", id).single()).data.next_payment_date;
const { data: go } = await sb.from("goals").insert({ user_id: uid, name: "Viaje", target_amount: 5000 }).select().single();
const { data: cats } = await sb.from("categories").select("id,name");
const catId = cats.find((c) => c.name === "Alimentación").id;

console.log("\n── Transferencia: 1500 de Banco a Efectivo ──");
const { data: tr, error: trErr } = await sb.rpc("transfer", { p_from_account: a1.id, p_to_account: a2.id, p_amount: 1500, p_description: "Retiro" });
if (trErr) die("transfer", trErr);
eq("Banco", await bal(a1.id), 8500);
eq("Efectivo", await bal(a2.id), 3500);
if (tr.to_account_id !== a2.id) die("transfer", "to_account_id no quedó registrado");

console.log("\n── Pago de crédito: 800 desde Efectivo ──");
const { error: pcErr } = await sb.rpc("pay_credit", { p_credit_id: cr.id, p_account_id: a2.id, p_amount: 800 });
if (pcErr) die("pay_credit", pcErr);
eq("Efectivo", await bal(a2.id), 2700);
eq("Deuda", await debtOf(cr.id), 2200);
const { count: pagos } = await sb.from("credit_payments").select("id", { count: "exact", head: true });
eq("Historial de pagos", pagos, 1);
eq("Próximo pago avanzó un mes", await nextPayOf(cr.id), "2030-02-15");

console.log("\n── Sobrepago: 5000 contra una deuda de 2200, y deshacerlo ──");
const { data: sobre, error: soErr } = await sb.rpc("pay_credit", { p_credit_id: cr.id, p_account_id: a1.id, p_amount: 5000 });
if (soErr) die("pay_credit sobrepago", soErr);
eq("Banco", await bal(a1.id), 3500);
eq("Deuda en cero, no negativa", await debtOf(cr.id), 0);
eq("Próximo pago avanzó otra vez", await nextPayOf(cr.id), "2030-03-15");
const { error: rsErr } = await sb.rpc("reverse_transaction", { p_id: sobre.id });
if (rsErr) die("reverse sobrepago", rsErr);
eq("Banco recuperó el pago", await bal(a1.id), 8500);
eq("Deuda vuelve a 2200, no a 7200", await debtOf(cr.id), 2200);
eq("Próximo pago vuelve a febrero", await nextPayOf(cr.id), "2030-02-15");

console.log("\n── Abono a meta: 1000 desde Banco ──");
const { error: cgErr } = await sb.rpc("contribute_goal", { p_goal_id: go.id, p_amount: 1000, p_account_id: a1.id });
if (cgErr) die("contribute_goal", cgErr);
eq("Banco", await bal(a1.id), 7500);
eq("Meta", await goalOf(go.id), 1000);

console.log("\n── Gasto y edición: 300 → 500 y cambio de cuenta ──");
const { data: tx, error: atErr } = await sb.rpc("apply_transaction", { p_account_id: a1.id, p_kind: "gasto", p_amount: 300, p_description: "tacos", p_category_id: catId });
if (atErr) die("apply_transaction", atErr);
eq("Banco tras gasto", await bal(a1.id), 7200);
const { error: upErr } = await sb.rpc("update_transaction", { p_id: tx.id, p_account_id: a2.id, p_kind: "gasto", p_amount: 500, p_description: "tacos (corregido)", p_category_id: catId });
if (upErr) die("update_transaction", upErr);
eq("Banco recuperó el gasto", await bal(a1.id), 7500);
eq("Efectivo absorbió el nuevo", await bal(a2.id), 2200);

console.log("\n── Monedas distintas, referencias ajenas y notas (0025) ──");
const { data: usd } = await sb.from("accounts").insert({ user_id: uid, name: "Dolares", balance: 500, currency: "USD" }).select().single();
const { error: mixto } = await sb.rpc("transfer", { p_from_account: a1.id, p_to_account: usd.id, p_amount: 100 });
eq("transferencia entre monedas distintas rechazada", !!mixto && mixto.message.includes("misma moneda"), true);
eq("Banco intacto", await bal(a1.id), 7500);
eq("Dolares intacta", await bal(usd.id), 500);
await sb.from("accounts").delete().eq("id", usd.id);

// una categoria que no es del usuario no se puede colgar de un movimiento propio
const { data: ajena } = await admin.from("categories").select("id").neq("user_id", uid).limit(1).single();
if (ajena) {
  const { error: catErr } = await sb.rpc("apply_transaction", { p_account_id: a1.id, p_kind: "gasto", p_amount: 5, p_description: "cat ajena", p_category_id: ajena.id });
  eq("categoria ajena rechazada", !!catErr && catErr.message.includes("no es tuya"), true);
} else {
  console.log("  · sin categorias de otro usuario en la base: no se pudo probar C9");
}

// editar el monto no borra la nota
const { data: conNota } = await sb.rpc("apply_transaction", { p_account_id: a1.id, p_kind: "gasto", p_amount: 50, p_description: "con nota", p_category_id: catId, p_notes: "acuerdate de esto" });
await sb.rpc("update_transaction", { p_id: conNota.id, p_account_id: a1.id, p_kind: "gasto", p_amount: 80, p_description: "con nota", p_category_id: catId });
const { data: trasEditar } = await sb.from("transactions").select("notes,category_id").eq("id", conNota.id).single();
eq("la nota sobrevive a la edicion", trasEditar.notes, "acuerdate de esto");
eq("la categoria sobrevive a la edicion", trasEditar.category_id, catId);
await sb.rpc("reverse_transaction", { p_id: conNota.id });

// deshacer un abono chico no descompleta una meta rebasada
const { data: meta2 } = await sb.from("goals").insert({ user_id: uid, name: "Viaje", target_amount: 1000, current_amount: 0 }).select().single();
await sb.rpc("contribute_goal", { p_goal_id: meta2.id, p_amount: 5000 });
const { data: chico } = await sb.rpc("contribute_goal", { p_goal_id: meta2.id, p_amount: 100 });
void chico;
const { data: txAbono } = await sb.from("transactions").select("id").eq("goal_id", meta2.id).order("created_at", { ascending: false }).limit(1);
if (txAbono.length) await sb.rpc("reverse_transaction", { p_id: txAbono[0].id });
const { data: meta2After } = await sb.from("goals").select("current_amount,completed_at").eq("id", meta2.id).single();
eq("la meta rebasada sigue completa tras deshacer un abono", meta2After.completed_at !== null, true);
await sb.from("goal_contributions").delete().eq("goal_id", meta2.id);
await sb.from("goals").delete().eq("id", meta2.id);

console.log("\n── Cuenta archivada: no recibe movimientos y pausa sus fijos (0023) ──");
const { data: a3 } = await sb.from("accounts").insert({ user_id: uid, name: "Vieja", balance: 100 }).select().single();
const { data: regla } = await sb.from("recurring_rules").insert({ user_id: uid, account_id: a3.id, name: "Suscripción", kind: "gasto", amount: 99, frequency: "mensual", next_run: "2030-01-01", active: true }).select().single();
const { error: arErr } = await sb.from("accounts").update({ archived_at: new Date().toISOString() }).eq("id", a3.id);
if (arErr) die("archivar", arErr);
const { error: bloq } = await sb.rpc("apply_transaction", { p_account_id: a3.id, p_kind: "gasto", p_amount: 10, p_description: "no debe entrar" });
eq("gasto en cuenta archivada rechazado", !!bloq && bloq.message.includes("archivada"), true);
const { error: bloqTr } = await sb.rpc("transfer", { p_from_account: a1.id, p_to_account: a3.id, p_amount: 10 });
eq("transferencia hacia archivada rechazada", !!bloqTr && bloqTr.message.includes("archivada"), true);
eq("Banco no se movió", await bal(a1.id), 7500);
const { data: reglaDespues } = await sb.from("recurring_rules").select("active").eq("id", regla.id).single();
eq("la regla de la cuenta archivada quedó pausada", reglaDespues.active, false);
await sb.from("recurring_rules").delete().eq("id", regla.id);
await sb.from("accounts").delete().eq("id", a3.id);

console.log("\n── Reversión de todo, en orden inverso ──");
const { data: all } = await sb.from("transactions").select("id").order("created_at", { ascending: false });
for (const t of all) {
  const { error } = await sb.rpc("reverse_transaction", { p_id: t.id });
  if (error) die("reverse_transaction", error);
}
eq("Banco", await bal(a1.id), 10000);
eq("Efectivo", await bal(a2.id), 2000);
eq("Deuda", await debtOf(cr.id), 3000);
eq("Próximo pago vuelve al original", await nextPayOf(cr.id), "2030-01-15");
eq("Meta", await goalOf(go.id), 0);
const { count: quedan } = await sb.from("transactions").select("id", { count: "exact", head: true });
eq("Transacciones restantes", quedan, 0);

await admin.auth.admin.deleteUser(uid);
console.log("\n✅ Flujos de dinero verificados: saldos exactos en ida y vuelta.");
process.exit(0);
