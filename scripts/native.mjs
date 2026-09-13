import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";
import { publicClientConfig, validateNativeConfig, validateConfigUrl, nativeEnvironment, verifyNativeBackend } from "./native-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [platform, ...args] = process.argv.slice(2);
const flags = new Set(["--apk", "--simulator", "--open"]);
const valueOptions = new Set(["--config-url", "--config-file", "--expected-commit", "--wait-seconds"]);
const options = {};
for (let i = 0; i < args.length; i++) {
  const name = args[i];
  if (flags.has(name)) options[name] = true;
  else if (valueOptions.has(name) && args[i + 1] && !args[i + 1].startsWith("--")) options[name] = args[++i];
  else throw new Error("Opción desconocida o incompleta: " + name);
}

function run(command, argv, env, cwd = root) {
  const result = spawnSync(command, argv, { cwd, env, stdio: "inherit" });
  if (result.error) throw new Error(command + ": " + result.error.message);
  if (result.status !== 0) throw new Error(command + " terminó con código " + result.status + ".");
}

async function readConfig() {
  if (options["--config-file"] && options["--config-url"]) throw new Error("Elige archivo de configuración o URL.");
  if (options["--config-file"]) return validateNativeConfig(JSON.parse(await readFile(path.resolve(options["--config-file"]), "utf8")), options["--expected-commit"]);
  if (options["--config-url"]) {
    const url = validateConfigUrl(options["--config-url"]);
    const seconds = Number(options["--wait-seconds"] || 0);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 600) throw new Error("La espera debe estar entre 0 y 600 segundos.");
    const deadline = Date.now() + seconds * 1000;
    for (;;) {
      try {
        const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000), cache: "no-store" });
        if (!response.ok) throw new Error("La configuración publicada respondió HTTP " + response.status + ".");
        return validateNativeConfig(await response.json(), options["--expected-commit"]);
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        console.log("Esperando la configuración del despliegue de este commit…");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  const env = { ...loadEnv("production", root, "VITE_"), ...process.env };
  try { return validateNativeConfig(publicClientConfig(env, process.env.COMMIT_REF || "local")); }
  catch (error) { throw new Error(error.message + " Usa tu .env real o --config-url con el /client-config.json del despliegue aprobado."); }
}

async function main() {
  if (!["android", "ios", "check"].includes(platform)) throw new Error("Uso: npm run native:prepare -- android|ios|check [--config-url URL] [--apk|--simulator|--open]");
  if (platform === "ios" && process.platform !== "darwin") throw new Error("La compilación de iOS requiere macOS con Xcode. Puedes verificar conexión con native:prepare -- check.");
  if (options["--apk"] && platform !== "android") throw new Error("--apk solo corresponde a Android.");
  if (options["--simulator"] && platform !== "ios") throw new Error("--simulator solo corresponde a iOS.");
  const config = await readConfig();
  console.log("Backend de Millions: " + config.supabaseUrl + " · IA: " + config.apiOrigin);
  await verifyNativeBackend(config);
  console.log("Conexión comprobada: Auth activo, CORS de iOS/Android y API de IA que exige sesión. No se han leído ni escrito movimientos.");
  if (platform === "check") return;

  const env = nativeEnvironment(config, process.env);
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  env.COMMIT_REF = process.env.COMMIT_REF || (git.status === 0 ? git.stdout.trim() : "local");
  run(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc")], env);
  run(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "build"], env);
  const built = validateNativeConfig(JSON.parse(await readFile(path.join(root, "dist/client-config.json"), "utf8")));
  if (built.publishableKey !== config.publishableKey || built.supabaseUrl !== config.supabaseUrl || built.apiOrigin !== config.apiOrigin) throw new Error("El bundle no coincide con la configuración verificada.");
  for (const name of ["manrope.ttf", "dm-sans.ttf"]) {
    if (!existsSync(path.join(root, "dist/fonts", name))) throw new Error("Falta una fuente del diseño: " + name);
  }
  if (existsSync(path.join(root, "dist/qa"))) throw new Error("No se puede empaquetar el entorno de datos simulados.");
  const cap = path.join(root, "node_modules/@capacitor/cli/bin/capacitor");
  run(process.execPath, [cap, "sync", platform], env);
  const nativeAssets = platform === "android" ? "android/app/src/main/assets" : "ios/App/App";
  const nativeConfig = JSON.parse(await readFile(path.join(root, nativeAssets, "capacitor.config.json"), "utf8"));
  if (nativeConfig.appId !== config.appId || nativeConfig.server?.url || nativeConfig.server?.hostname) throw new Error("Capacitor debe cargar el bundle local de Millions con sus orígenes nativos.");
  const copied = await readFile(path.join(root, nativeAssets, "public/client-config.json"), "utf8");
  if (copied !== await readFile(path.join(root, "dist/client-config.json"), "utf8")) throw new Error("Capacitor no copió la configuración del nuevo bundle.");
  await mkdir(path.join(root, ".native-build"), { recursive: true });
  await writeFile(path.join(root, ".native-build", platform + ".json"), JSON.stringify({
    commit: env.COMMIT_REF, platform, appId: config.appId, supabaseUrl: config.supabaseUrl, apiOrigin: config.apiOrigin,
    data: "backend real; los datos requieren iniciar sesión",
    authenticatedUserTest: false, physicalDeviceTest: false,
  }, null, 2) + "\n");
  if (options["--apk"]) {
    const cwd = path.join(root, "android");
    if (process.platform === "win32") run("cmd.exe", ["/d", "/c", "gradlew.bat", "assembleDebug", "--no-daemon"], env, cwd);
    else run("bash", ["gradlew", "assembleDebug", "--no-daemon"], env, cwd);
    console.log("APK: android/app/build/outputs/apk/debug/app-debug.apk (firma de desarrollo; backend real).");
  }
  if (options["--simulator"]) {
    run("xcodebuild", ["-workspace", "App.xcworkspace", "-scheme", "App", "-configuration", "Debug", "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator", "-derivedDataPath", "build/native", "CODE_SIGNING_ALLOWED=NO", "build"], env, path.join(root, "ios/App"));
    console.log("iOS compilado para simulador. Instalar en iPhone requiere la firma de Apple desde la Mac.");
  }
  if (options["--open"]) run(process.execPath, [cap, "open", platform], env);
}

main().catch(error => { console.error("No se completó la preparación nativa: " + error.message); process.exitCode = 1; });
