import { useState } from "react";
import { authOrigin } from "../lib/native";
import { clickable } from "../lib/a11y";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import { C, R, S, T } from "../lib/constants";
import type { Session } from "@supabase/supabase-js";
import { sbClient } from "../lib/supabase";
import Captcha, { CAPTCHA_ENABLED } from "../components/Captcha";
import LegalModal from "../modals/LegalModal";
import { LEGAL_VERSION, type LegalDoc } from "../lib/legal";

export default function AuthScreen({ onAuth }: { onAuth: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [aceptado, setAceptado] = useState(false);
  const [verDoc, setVerDoc] = useState<LegalDoc["key"] | null>(null);
  const inp = { ...S.inp, padding: "13px 16px", marginBottom: 12 } as const;
  const submit = async () => {
    if (loading) return;
    if (!email || !password) { setError("Completa todos los campos"); return; }
    if (mode === "signup" && password.length < 8) { setError("La contraseña necesita al menos 8 caracteres"); return; }
    if (mode === "signup" && !aceptado) { setError("Necesitas aceptar el aviso de privacidad y los términos"); return; }
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
          // legal_version viaja en el metadata porque la fila de profiles todavía
          // no existe: la crea el trigger on_auth_user_created, que la aterriza
          // junto con la fecha de aceptación.
          // El enlace del correo aterriza en /auth: en la web lo resuelve el
          // cliente solo; en nativo, el sistema abre la app con esa URL.
          options: { data: { name, legal_version: LEGAL_VERSION }, emailRedirectTo: `${authOrigin()}/auth`, ...(captchaToken ? { captchaToken } : {}) },
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
    <div className="auth-shell">
      <div className="auth-intro"><div className="wordmark">Millions<span>.</span></div><h1>Tu dinero.<br/>En tus palabras.</h1><p className="muted">Registra lo que pasa y entiende lo que viene.</p></div>
      <div className="auth-form">
        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: C.surface, borderRadius: R.md, padding: 4 }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "9px", borderRadius: R.sm, border: "none", background: mode === m ? C.accent : "transparent", color: mode === m ? "#fff" : C.muted, fontWeight: 700, fontSize: T.base, cursor: "pointer" }}>{m === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>
          ))}
        </div>
        {/* F6: `htmlFor` + `id` en los tres. Sin eso el lector de pantalla
            anuncia "cuadro de edición" a secas, y el rótulo que sí se ve no le
            sirve de nada a quien no lo ve. `autoComplete` de paso: es lo que
            hace que el gestor de contraseñas ofrezca guardar y rellenar. */}
        {mode === "signup" && <><label htmlFor="auth-nombre" style={{ fontSize: T.sm, color: C.muted, marginBottom: 5, display: "block" }}>Nombre</label><input id="auth-nombre" name="name" autoComplete="name" style={inp} placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} /></>}
        <label htmlFor="auth-correo" style={{ fontSize: T.sm, color: C.muted, marginBottom: 5, display: "block" }}>Correo</label>
        <input id="auth-correo" name="email" autoComplete="email" style={inp} type="email" inputMode="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <label htmlFor="auth-password" style={{ fontSize: T.sm, color: C.muted, marginBottom: 5, display: "block" }}>Contraseña</label>
        <input id="auth-password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} style={{ ...inp, marginBottom: 20 }} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {mode === "signup" && (
          // Casilla sin marcar por defecto: un consentimiento premarcado no es
          // consentimiento. Los enlaces abren el texto sin salir del registro,
          // porque mandarlos fuera aquí es perder a la persona.
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={aceptado}
              onChange={(e) => { setAceptado(e.target.checked); setError(""); }}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: C.accent, flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
              He leído y acepto el{" "}
              <span {...clickable(() => setVerDoc("privacidad"))} onClick={(e) => { e.preventDefault(); setVerDoc("privacidad"); }} style={{ color: C.aLight, fontWeight: 600, textDecoration: "underline" }}>aviso de privacidad</span>
              {" "}y los{" "}
              <span {...clickable(() => setVerDoc("terminos"))} onClick={(e) => { e.preventDefault(); setVerDoc("terminos"); }} style={{ color: C.aLight, fontWeight: 600, textDecoration: "underline" }}>términos y condiciones</span>.
            </span>
          </label>
        )}
        {mode === "signup" && <Captcha onToken={setCaptchaToken} />}
        {error && <ErrorBox>{error}</ErrorBox>}
        {success && <div style={{ background: C.green + "18", border: `1px solid ${C.green}44`, borderRadius: R.sm, padding: "10px 14px", fontSize: T.md, color: C.green, marginBottom: 14 }}>{success}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: R.md, padding: "14px", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? <Spinner /> : (mode === "login" ? "Entrar" : "Crear cuenta")}
        </button>
      </div>

      {/* También accesibles al iniciar sesión: la ley pide que el aviso esté
          disponible en todo momento, no solo en el momento de aceptarlo. */}
      <div style={{ marginTop: 20, display: "flex", gap: 16, fontSize: T.sm }}>
        <span {...clickable(() => setVerDoc("privacidad"))} style={{ color: C.muted, cursor: "pointer", textDecoration: "underline" }}>Aviso de privacidad</span>
        <span {...clickable(() => setVerDoc("terminos"))} style={{ color: C.muted, cursor: "pointer", textDecoration: "underline" }}>Términos</span>
      </div>

      {verDoc && <LegalModal doc={verDoc} onClose={() => setVerDoc(null)} />}
    </div>
  );
}
