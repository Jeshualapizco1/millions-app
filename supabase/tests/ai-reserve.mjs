// ============================================================================
// Verifica que el tope de IA aguanta concurrencia (migración 0018):
// - 30 reservas en paralelo contra un tope diario de 15 dejan EXACTAMENTE 15
//   filas en ai_usage y 15 rechazos con motivo "dia"
// - con presupuesto global en cero no se reserva nada
// - las reservas nacen con el costo estimado, no en cero
//
// Solo toca la RPC con la secret key: no llama a Anthropic ni gasta nada.
// Crea y borra un usuario desechable; sus filas de ai_usage caen en cascada.
//
// Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node supabase/tests/ai-reserve.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
if (!URL || !SK) { console.error("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY"); process.exit(1); }

const admin = createClient(URL, SK, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (s, e) => { console.error("✗", s, e?.message ?? e); process.exit(1); };

const email = "ai-reserve-test@millions.local";
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of list.users.filter((u) => u.email === email)) await admin.auth.admin.deleteUser(u.id);
const { data: cu, error: cuErr } = await admin.auth.admin.createUser({ email, password: "reserve-Pass-123!", email_confirm: true });
if (cuErr) die("createUser", cuErr);
const uid = cu.user.id;

const reservar = (extra = {}) =>
  admin.rpc("reserve_ai_call", {
    p_user: uid,
    p_intent: "capture",
    p_model: "prueba",
    p_estimated_cost: 0.001,
    p_day_limit: 15,
    p_month_limit: 400,
    p_budget_usd: 1000,
    ...extra,
  });

// 1. 30 en paralelo contra 15
const N = 30;
const resultados = await Promise.all(Array.from({ length: N }, () => reservar()));
const filas = resultados.map((r, i) => { if (r.error) die(`reserva ${i}`, r.error); return r.data[0]; });
const aceptadas = filas.filter((f) => f.reserva !== null);
const rechazadas = filas.filter((f) => f.reserva === null);
if (aceptadas.length !== 15) die("concurrencia", `aceptó ${aceptadas.length} de ${N}, esperaba 15`);
if (rechazadas.length !== 15 || rechazadas.some((f) => f.motivo !== "dia")) die("motivo", JSON.stringify(rechazadas.slice(0, 3)));

const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", uid);
if (count !== 15) die("filas en ai_usage", `hay ${count}, esperaba 15`);

// 2. el costo estimado queda registrado desde el principio
const { data: fila } = await admin.from("ai_usage").select("cost_usd,tokens_in,tokens_out").eq("user_id", uid).limit(1).single();
if (Number(fila.cost_usd) !== 0.001 || fila.tokens_in !== 0) die("costo estimado", JSON.stringify(fila));

// 3. presupuesto global en cero: nadie pasa, aunque el usuario tenga cupo
const { data: sinPresupuesto, error: spErr } = await admin.rpc("reserve_ai_call", {
  p_user: uid, p_intent: "advise", p_model: "prueba", p_estimated_cost: 0.005,
  p_day_limit: 1000, p_month_limit: 1000, p_budget_usd: 0,
});
if (spErr) die("presupuesto", spErr);
if (sinPresupuesto[0].reserva !== null || sinPresupuesto[0].motivo !== "presupuesto") die("presupuesto", JSON.stringify(sinPresupuesto));

// 4. limpieza
await admin.auth.admin.deleteUser(uid);
console.log("✅ reserve_ai_call: 30 en paralelo → 15 reservas y 15 rechazos, costo estimado registrado, presupuesto en cero bloquea");
process.exit(0);
