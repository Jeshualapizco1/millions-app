import { readFileSync } from "node:fs";

export const backend = JSON.parse(readFileSync(new URL("../src/lib/backend.json", import.meta.url), "utf8"));

function isClientKey(key) {
  if (typeof key !== "string") return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const claims = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    return claims.role === "anon";
  } catch { return false; }
}

/** Solo campos que ya forman parte del cliente; nunca variables del servidor. */
export function publicClientConfig(env, commit = "local") {
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (key && !isClientKey(key)) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY debe ser pública (publishable o anon). No se publicará otra clase de llave.");
  return {
    schemaVersion: 1,
    appId: "io.millionsapp.app",
    commit,
    supabaseUrl: env.VITE_SUPABASE_URL || "",
    publishableKey: key,
    apiOrigin: (env.VITE_API_BASE || backend.apiOrigin).replace(/\/+$/, ""),
  };
}

export function validateNativeConfig(config, expectedCommit) {
  if (config?.schemaVersion !== 1 || config.appId !== "io.millionsapp.app") throw new Error("La configuración no pertenece a Millions.");
  if (config.supabaseUrl !== "https://" + backend.projectId + ".supabase.co") throw new Error("La compilación nativa necesita el proyecto real de Millions; no se aceptan URLs de ejemplo.");
  if (!isClientKey(config.publishableKey) || /placeholder|example|dummy|ci_placeholder|local_preview/i.test(config.publishableKey)) throw new Error("Falta una llave pública real de Millions.");
  if (config.apiOrigin !== backend.apiOrigin) throw new Error("La API nativa debe apuntar al dominio real de Millions.");
  if (expectedCommit && config.commit !== expectedCommit) throw new Error("La vista previa todavía no corresponde al commit que se está compilando.");
  return config;
}

export function validateConfigUrl(value) {
  const url = new URL(value);
  const trusted = url.origin === backend.apiOrigin
    || url.origin === "https://millionsjeshua.netlify.app"
    || /^deploy-preview-\d+--millionsjeshua\.netlify\.app$/.test(url.hostname);
  if (!trusted || url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/client-config.json") {
    throw new Error("Usa /client-config.json en el dominio de Millions o en su Deploy Preview.");
  }
  return url;
}

/** No escribe ni sobrescribe .env; devuelve variables solo para el proceso hijo. */
export function nativeEnvironment(config, parent = {}) {
  validateNativeConfig(config);
  return {
    ...parent,
    VITE_SUPABASE_URL: config.supabaseUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
    VITE_API_BASE: config.apiOrigin,
  };
}

export async function verifyNativeBackend(config, request = fetch) {
  validateNativeConfig(config);
  const endpoint = config.apiOrigin + "/.netlify/functions/chat";
  const checkedRequest = async (url, options) => {
    try { return await request(url, options); }
    catch (error) { throw new Error("No se pudo comprobar " + (options.method || "GET") + " " + url + ": " + error.message); }
  };
  for (const origin of ["capacitor://localhost", "https://localhost"]) {
    const res = await checkedRequest(endpoint, {
      method: "OPTIONS", redirect: "error", signal: AbortSignal.timeout(20000),
      headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" },
    });
    const methods = (res.headers.get("access-control-allow-methods") || "").toUpperCase();
    const headers = (res.headers.get("access-control-allow-headers") || "").toLowerCase();
    if (res.status !== 204 || res.headers.get("access-control-allow-origin") !== origin || !methods.includes("POST") || !headers.includes("authorization")) {
      throw new Error("La API real no admite el origen nativo " + origin + ".");
    }
  }
  const auth = await checkedRequest(config.supabaseUrl + "/auth/v1/health", {
    redirect: "error", signal: AbortSignal.timeout(20000), headers: { apikey: config.publishableKey },
  });
  if (!auth.ok) throw new Error("Supabase Auth no respondió correctamente con la configuración pública.");
  const protectedApi = await checkedRequest(endpoint, {
    redirect: "error", signal: AbortSignal.timeout(20000), headers: { Origin: "capacitor://localhost" },
  });
  if (protectedApi.status !== 401) throw new Error("La API de IA debe exigir sesión; revisar su respuesta antes de empaquetar.");
}
