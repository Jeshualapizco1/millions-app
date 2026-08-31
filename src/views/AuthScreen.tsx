import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sbClient } from "../lib/supabase";
import Captcha, { CAPTCHA_ENABLED } from "../components/Captcha";

export default function AuthScreen({ onAuth }: { onAuth: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const inp = { width: "100%", background: "#12121a", border: "1px solid #2a2a3e", borderRadius: 12, color: "#e8e6ff", padding: "13px 16px", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 } as const;
  const submit = async () => {
    if (!email || !password) { setError("Completa todos los campos"); return; }
    if (mode === "signup" && password.length < 8) { setError("La contraseña necesita al menos 8 caracteres"); return; }
    if (mode === "signup" && CAPTCHA_ENABLED && !captchaToken) { setError("Completa la verificación de seguridad"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "login") {
        const { data, error: err } = await sbClient.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuth(data.session);
      } else {
        const { data, error: err } = await sbClient.auth.signUp({
          email,
          password,
          options: { data: { name }, ...(captchaToken ? { captchaToken } : {}) },
        });
        if (err) throw err;
        if (data.session) onAuth(data.session);
        // Sin sesión significa que falta confirmar el correo: se dice qué
        // hacer exactamente, incluido revisar spam, que es donde suele caer.
        else setSuccess(`Te enviamos un correo a ${email}. Ábrelo para activar tu cuenta — si no llega en unos minutos, revisa la carpeta de spam.`);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      setError(
        msg === "Invalid login credentials" ? "Correo o contraseña incorrectos"
        : msg.includes("Email not confirmed") ? "Todavía no confirmas tu correo. Busca el mensaje que te enviamos."
        : msg.includes("already registered") ? "Ese correo ya tiene una cuenta. Inicia sesión."
        : msg.includes("Signups not allowed") ? "El registro está cerrado por ahora."
        : msg
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0f", padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>💰</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#a89ff9", letterSpacing: -0.5 }}>Millions</div>
        <div style={{ fontSize: 13, color: "#6b6a8a", marginTop: 4 }}>Finanzas personales</div>
      </div>
      <div style={{ width: "100%", maxWidth: 380, background: "#1a1a26", border: "1px solid #2a2a3e", borderRadius: 24, padding: 28 }}>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#12121a", borderRadius: 12, padding: 4 }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: mode === m ? "#7c6af7" : "transparent", color: mode === m ? "#fff" : "#6b6a8a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{m === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>
          ))}
        </div>
        {mode === "signup" && <><label style={{ fontSize: 12, color: "#6b6a8a", marginBottom: 5, display: "block" }}>Nombre</label><input style={inp} placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} /></>}
        <label style={{ fontSize: 12, color: "#6b6a8a", marginBottom: 5, display: "block" }}>Correo</label>
        <input style={inp} type="email" inputMode="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <label style={{ fontSize: 12, color: "#6b6a8a", marginBottom: 5, display: "block" }}>Contraseña</label>
        <input style={{ ...inp, marginBottom: 20 }} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {mode === "signup" && <Captcha onToken={setCaptchaToken} />}
        {error && <div style={{ background: "#f8717118", border: "1px solid #f8717144", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: "#4ade8018", border: "1px solid #4ade8044", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#4ade80", marginBottom: 14 }}>{success}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#7c6af7,#9333ea)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : (mode === "login" ? "Entrar" : "Crear cuenta")}
        </button>
      </div>
    </div>
  );
}
