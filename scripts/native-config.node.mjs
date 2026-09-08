import test from "node:test";
import assert from "node:assert/strict";
import { backend, publicClientConfig, validateNativeConfig, validateConfigUrl, nativeEnvironment, verifyNativeBackend } from "./native-config.mjs";

const env = { VITE_SUPABASE_URL: "https://" + backend.projectId + ".supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };
const config = publicClientConfig(env, "a".repeat(40));

test("la configuración pública nunca incluye variables del servidor", () => {
  const output = publicClientConfig({ ...env, SUPABASE_SECRET_KEY: "server-only-value", ANTHROPIC_API_KEY: "server-only-value" });
  assert.equal(Object.keys(output).length, 6);
  assert.ok(!JSON.stringify(output).includes("server-only-value"));
  assert.throws(() => publicClientConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: "not-a-publishable-key" }), /pública/);
  const privilegedJwt = "eyJ." + Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url") + ".sig";
  assert.throws(() => publicClientConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: privilegedJwt }), /pública/);
});

test("impide empaquetar ejemplos, otro backend y un commit antiguo", () => {
  assert.equal(validateNativeConfig(config, "a".repeat(40)), config);
  assert.throws(() => validateNativeConfig({ ...config, supabaseUrl: "https://example.supabase.co" }), /proyecto real/);
  assert.throws(() => validateNativeConfig({ ...config, publishableKey: "sb_publishable_ci_placeholder" }), /pública real/);
  assert.throws(() => validateNativeConfig({ ...config, apiOrigin: "https://example.com" }), /dominio real/);
  assert.throws(() => validateNativeConfig(config, "b".repeat(40)), /commit/);
});

test("solo descarga configuración desde los hosts y la ruta aprobados", () => {
  assert.equal(validateConfigUrl("https://deploy-preview-1--millionsjeshua.netlify.app/client-config.json").hostname, "deploy-preview-1--millionsjeshua.netlify.app");
  for (const url of ["http://app.millionsapp.io/client-config.json", "https://app.millionsapp.io.evil.test/client-config.json", "https://other.netlify.app/client-config.json", "https://app.millionsapp.io/client-config.json?token=x", "https://app.millionsapp.io:8443/client-config.json"]) {
    assert.throws(() => validateConfigUrl(url));
  }
});

test("el entorno real sustituye placeholders sin modificar el entorno original", () => {
  const original = { VITE_SUPABASE_URL: "https://example.supabase.co", PATH: "/bin" };
  const result = nativeEnvironment(config, original);
  assert.equal(result.VITE_SUPABASE_URL, env.VITE_SUPABASE_URL);
  assert.equal(result.VITE_API_BASE, backend.apiOrigin);
  assert.equal(original.VITE_SUPABASE_URL, "https://example.supabase.co");
});

test("verifica los dos orígenes nativos y Auth sin hacer una escritura ni una llamada de IA", async () => {
  const calls = [];
  await verifyNativeBackend(config, async (url, opts) => {
    calls.push({ url, method: opts.method || "GET" });
    if (opts.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": opts.headers.Origin, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "Authorization, Content-Type" } });
    return new Response("{}", { status: url.endsWith("/health") ? 200 : 401 });
  });
  assert.deepEqual(calls.map(c => c.method), ["OPTIONS", "OPTIONS", "GET", "GET"]);
  await assert.rejects(verifyNativeBackend(config, async () => new Response(null, { status: 204 })), /origen nativo/);
});
