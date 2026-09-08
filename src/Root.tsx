import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import App from "./App";
import { sbClient } from "./lib/supabase";
import AuthScreen from "./views/AuthScreen";
import Publica, { esRutaPublica } from "./views/Publica";
import { useAppearance } from "./lib/appearance";
import { C } from "./lib/constants";
import { MoneyPrivacy } from "./components/Money";

export default function Root() {
  useAppearance();
  // Las páginas legales y de soporte se sirven sin sesión: las tiendas piden
  // una URL pública de privacidad y de soporte, y la ley pide que el aviso
  // esté disponible en todo momento, no solo detrás del login.
  const ruta = window.location.pathname.replace(/\/+$/, "") || "/";
  if (esRutaPublica(ruta)) return <Publica ruta={ruta} />;
  // /auth: aquí aterriza el enlace del correo. supabase-js ya cambió el `code`
  // por sesión al cargar (detectSessionInUrl); solo se limpia la URL.
  if (ruta === "/auth" && typeof history !== "undefined") history.replaceState(null, "", "/");

  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    sbClient.auth.getSession().then(({ data: { session } }) => { setSession(session); setChecking(false); });
    const { data: { subscription } } = sbClient.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  const signOut = async () => {
    await sbClient.auth.signOut();
    setSession(null);
  };
  if (checking) return (
    <div role="status" aria-label="Cargando tu sesión" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, flexDirection: "column", gap: 16 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
  if (!session) return <AuthScreen onAuth={setSession} />;
  return <MoneyPrivacy key={session.user.id}><App session={session} onSignOut={signOut} /></MoneyPrivacy>;
}
