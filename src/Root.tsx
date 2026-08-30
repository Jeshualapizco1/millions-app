import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import App from "./App";
import { sbClient } from "./lib/supabase";
import AuthScreen from "./views/AuthScreen";

export default function Root() {
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
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 52 }}>💰</div>
      <div style={{ width: 28, height: 28, border: "3px solid #7c6af7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
  if (!session) return <AuthScreen onAuth={setSession} />;
  return <App session={session} onSignOut={signOut} />;
}
