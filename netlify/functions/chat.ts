// ============================================================================
// Única responsabilidad: la IA. El CRUD va directo del cliente a Supabase
// bajo RLS. Aquí: se verifica el JWT, se valida el body con zod, se construye
// el contexto financiero EN EL SERVIDOR (el cliente no puede manipularlo),
// el modelo y max_tokens están fijos, y hay rate limit por usuario.
// ============================================================================
import type { Handler } from "@netlify/functions";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../../src/lib/database.types";

const MODEL = "claude-opus-5";
const RATE_LIMIT_PER_HOUR = 20;

/**
 * Cliente de servidor (secret key): salta RLS, por eso TODA query filtra por
 * el uid verificado del JWT. Nunca se usa sin ese filtro.
 * Perezoso a propósito: si falta una variable de entorno queremos un 500 con
 * mensaje claro, no un 502 por crash al importar el módulo.
 */
let _admin: SupabaseClient<Database> | null = null;
const getAdmin = (): SupabaseClient<Database> => {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Configuración incompleta: faltan SUPABASE_URL o SUPABASE_SECRET_KEY en este entorno");
  _admin = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _admin;
};

const BodySchema = z.object({
  intent: z.enum(["capture", "advise"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(24),
});

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);

const CAPTURE_PROMPT = (accounts: string, categories: string) => `Asistente de registro financiero de Millions. Cuentas del usuario: ${accounts || "ninguna"}. Categorías válidas: ${categories}.
Responde SOLO con JSON:
Transacción: {"action":"transaccion","type":"gasto|ingreso","amount":NUMBER,"description":"STRING","accountName":"STRING (nombre EXACTO de una cuenta de la lista)","category":"STRING (una de las categorías válidas)","reply":"Confirmación breve"}
Nueva cuenta: {"action":"nueva_cuenta","accountName":"STRING","balance":NUMBER,"icon":"EMOJI","reply":"Confirmación"}
Duda: {"action":"ninguna","reply":"Aclaración"}`;

async function buildContext(intent: "capture" | "advise", userId: string): Promise<string> {
  const { data: accounts } = await getAdmin()
    .from("accounts")
    .select("id,name,balance")
    .eq("user_id", userId)
    .is("archived_at", null);
  const { data: categories } = await getAdmin()
    .from("categories")
    .select("name")
    .eq("user_id", userId)
    .eq("hidden", false)
    .order("sort_order");
  const accList = (accounts ?? []).map((a) => `${a.name}: ${fmt(a.balance)}`).join(", ");
  const catList = (categories ?? []).map((c) => c.name).join(", ");

  if (intent === "capture") return CAPTURE_PROMPT(accList, catList);

  const [{ data: txs }, { data: credits }, { data: budgets }, { data: goals }] = await Promise.all([
    getAdmin()
      .from("transactions")
      .select("kind,amount,description,date,category:categories(name)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(100),
    getAdmin().from("credits").select("name,total_debt").eq("user_id", userId).is("archived_at", null),
    getAdmin().from("budgets").select("amount,category:categories(name)").eq("user_id", userId).eq("period", "mensual"),
    getAdmin().from("goals").select("name,target_amount,current_amount,target_date").eq("user_id", userId),
  ]);

  const now = new Date();
  const isThisMonth = (d: string) => {
    const t = new Date(d);
    return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
  };
  const monthTxs = (txs ?? []).filter((t) => isThisMonth(t.date));
  const monthG = monthTxs.filter((t) => t.kind === "gasto").reduce((s, t) => s + Number(t.amount), 0);
  const monthI = monthTxs.filter((t) => t.kind === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
  const catMap: Record<string, number> = {};
  monthTxs
    .filter((t) => t.kind === "gasto")
    .forEach((t) => {
      const c = (t.category as unknown as { name: string } | null)?.name ?? "Otros";
      catMap[c] = (catMap[c] || 0) + Number(t.amount);
    });
  const budgetStatus = (budgets ?? [])
    .map((b) => {
      const cat = (b.category as unknown as { name: string } | null)?.name ?? "Otros";
      const spent = catMap[cat] || 0;
      return `${cat}: presupuesto ${fmt(b.amount)}, gastado ${fmt(spent)} (${b.amount > 0 ? Math.round((spent / Number(b.amount)) * 100) : 0}%)`;
    })
    .join("\n");
  const goalStatus = (goals ?? [])
    .map((g) => {
      const pct = Number(g.target_amount) > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
      return `${g.name}: meta ${fmt(g.target_amount)}, ahorrado ${fmt(g.current_amount)} (${pct}%)${g.target_date ? `, fecha objetivo ${g.target_date}` : ""}`;
    })
    .join("\n");

  return `Eres el asesor financiero de Millions. Responde en español, amigable, claro y accionable. Máximo 3 párrafos, emojis moderados.

DATOS (mes en curso salvo que se indique):
Cuentas: ${accList || "Sin cuentas"}
Este mes — Ingresos: ${fmt(monthI)} | Gastos: ${fmt(monthG)}
Gastos del mes por categoría: ${Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${fmt(v)}`).join(", ") || "Sin gastos"}
Deuda total: ${fmt((credits ?? []).reduce((s, c) => s + Number(c.total_debt), 0))}
Créditos: ${(credits ?? []).map((c) => `${c.name}: ${fmt(c.total_debt)}`).join(", ") || "Ninguno"}
Presupuestos del mes:\n${budgetStatus || "Sin presupuestos"}
Metas de ahorro:\n${goalStatus || "Sin metas"}
Últimas transacciones: ${(txs ?? []).slice(0, 15).map((t) => `${t.kind === "ingreso" ? "+" : "-"}${fmt(t.amount)} ${t.description}`).join(", ") || "Ninguna"}`;
}

export const handler: Handler = async (event) => {
  const h = { "Content-Type": "application/json" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: h, body: JSON.stringify({ error: "Method Not Allowed" }) };

  try {
    // ── Auth: JWT del usuario, verificado contra Supabase ───────────────────
    const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return { statusCode: 401, headers: h, body: JSON.stringify({ error: "No autenticado" }) };
    const { data: userData, error: userErr } = await getAdmin().auth.getUser(token);
    if (userErr || !userData.user) return { statusCode: 401, headers: h, body: JSON.stringify({ error: "No autenticado" }) };
    const userId = userData.user.id;

    // ── Validación ──────────────────────────────────────────────────────────
    if ((event.body?.length ?? 0) > 64_000) return { statusCode: 413, headers: h, body: JSON.stringify({ error: "Body demasiado grande" }) };
    const parsed = BodySchema.safeParse(JSON.parse(event.body || "{}"));
    if (!parsed.success) return { statusCode: 400, headers: h, body: JSON.stringify({ error: "Body inválido" }) };
    const { intent, messages } = parsed.data;

    // ── Rate limit por usuario ──────────────────────────────────────────────
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await getAdmin()
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", hourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR)
      return { statusCode: 429, headers: h, body: JSON.stringify({ error: "Límite de consultas por hora alcanzado. Intenta más tarde." }) };

    // ── Contexto en servidor + llamada a Anthropic ──────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Configuración incompleta: falta ANTHROPIC_API_KEY en este entorno");

    const system = await buildContext(intent, userId);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: intent === "capture" ? 1000 : 2000,
        // Capturar un movimiento es extracción simple: poco esfuerzo, menos latencia
        // y menos costo. El asesor sí razona sobre todo el panorama financiero.
        output_config: { effort: intent === "capture" ? "low" : "high" },
        system,
        messages,
      }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      console.error("anthropic error:", res.status, JSON.stringify(data).slice(0, 500));
      return { statusCode: 502, headers: h, body: JSON.stringify({ error: "El servicio de IA no está disponible" }) };
    }

    const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    await getAdmin().from("ai_usage").insert({
      user_id: userId,
      intent,
      tokens_in: data.usage?.input_tokens ?? 0,
      tokens_out: data.usage?.output_tokens ?? 0,
    });

    return { statusCode: 200, headers: h, body: JSON.stringify({ text }) };
  } catch (e) {
    console.error("chat function error:", e);
    // Un fallo de configuración sí se nombra: es accionable y no expone datos.
    const msg = e instanceof Error && e.message.startsWith("Configuración incompleta") ? e.message : "Error interno";
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: msg }) };
  }
};
