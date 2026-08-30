// ============================================================================
// Verifica el ciclo de acciones del asesor contra producción:
// - una petición de análisis NO propone acción
// - una petición de hacer algo SÍ la propone, sin ejecutarla
// - el tool_result cierra la conversación
// - una cuenta inexistente no se inventa
//
// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=... [SITE=...] node supabase/tests/ai-actions.mjs
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const SITE = process.env.SITE || "https://millionsjeshua.netlify.app";
const URL = process.env.SUPABASE_URL;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const SK = process.env.SUPABASE_SECRET_KEY;
if (!URL || !PK || !SK) { console.error("Faltan variables de entorno"); process.exit(1); }

const admin = createClient(URL, SK, { auth: { autoRefreshToken: false, persistSession: false } });
const die = (s, e) => { console.error("✗", s, e ?? ""); process.exit(1); };
const email = "ai-test@millions.local", password = "ai-Test-123!";

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
for (const u of list.users.filter((u) => u.email === email)) await admin.auth.admin.deleteUser(u.id);
const { data: cu } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const uid = cu.user.id;

const sb = createClient(URL, PK, { auth: { persistSession: false } });
const { data: sess } = await sb.auth.signInWithPassword({ email, password });
const token = sess.session.access_token;

await sb.from("accounts").insert([
  { user_id: uid, name: "BanRegio", balance: 20000 },
  { user_id: uid, name: "Efectivo", balance: 5000 },
]);

const ask = async (messages) => {
  const r = await fetch(`${SITE}/.netlify/functions/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ intent: "advise", messages }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

// 1. Pregunta de análisis: NO debe proponer acción
console.log("\n── Pregunta de análisis ──");
const q = await ask([{ role: "user", content: "¿Cuánto tengo en total? Sé breve." }]);
if (q.status !== 200) die("análisis", q.status);
console.log("  respuesta:", String(q.body.text).slice(0, 90).replace(/\n/g, " "));
if (q.body.action) die("análisis", "propuso una acción cuando solo se preguntó");
console.log("  ✓ no propone acción");

// 2. Petición explícita: SÍ debe proponerla, sin ejecutar
console.log("\n── Petición de transferir ──");
const t = await ask([{ role: "user", content: "Transfiere 2000 pesos de BanRegio a Efectivo" }]);
if (t.status !== 200) die("transferir", t.status);
const action = t.body.action;
if (!action) die("transferir", "no propuso acción");
console.log(`  propuso: ${action.name}`, JSON.stringify(action.input));
if (action.name !== "transferir") die("transferir", `herramienta inesperada: ${action.name}`);
if (Number(action.input.monto) !== 2000) die("transferir", `monto ${action.input.monto}`);

const { data: antes } = await sb.from("accounts").select("balance").eq("name", "BanRegio").single();
if (Number(antes.balance) !== 20000) die("seguridad", "¡el saldo cambió sin confirmar!");
console.log("  ✓ propone pero NO ejecuta: BanRegio sigue en 20000");

// 3. El tool_result cierra la conversación
console.log("\n── Confirmación (tool_result) ──");
const cierre = await ask([
  { role: "user", content: "Transfiere 2000 pesos de BanRegio a Efectivo" },
  { role: "assistant", content: t.body.raw },
  { role: "user", content: [{ type: "tool_result", tool_use_id: action.toolUseId, content: "Transferencia hecha: $2,000.00 de BanRegio a Efectivo." }] },
]);
if (cierre.status !== 200) die("cierre", `${cierre.status} ${JSON.stringify(cierre.body).slice(0, 200)}`);
console.log("  respuesta:", String(cierre.body.text).slice(0, 120).replace(/\n/g, " "));
console.log("  ✓ el modelo continúa tras el resultado");

// 4. Cuenta inexistente: no debe inventarse una
console.log("\n── Cuenta que no existe ──");
const x = await ask([{ role: "user", content: "Transfiere 500 de Santander a Efectivo" }]);
const nombres = ["banregio", "efectivo"];
if (x.body.action) {
  const desde = String(x.body.action.input.desde ?? "").toLowerCase();
  if (nombres.includes(desde)) die("cuenta inexistente", `sustituyó Santander por ${desde}`);
  console.log(`  propuso con "${x.body.action.input.desde}" — el cliente lo rechazará al resolver`);
} else {
  console.log("  respuesta:", String(x.body.text).slice(0, 120).replace(/\n/g, " "));
  console.log("  ✓ pregunta en vez de adivinar");
}

await admin.auth.admin.deleteUser(uid);
console.log("\n✅ Ciclo de acciones verificado: propone, no ejecuta y cierra tras confirmar.");
process.exit(0);
