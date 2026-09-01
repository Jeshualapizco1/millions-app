import { useState } from "react";
import ErrorBox from "../components/ErrorBox";
import { C, S, T } from "../lib/constants";
import { LEGAL_VERSION, type LegalDoc } from "../lib/legal";
import LegalModal from "../modals/LegalModal";

/**
 * Portón de aceptación para cuentas que ya existían.
 *
 * La casilla del registro solo cubre a quien se dé de alta de ahora en
 * adelante. Las cuentas anteriores —y cualquiera cuando cambie el texto—
 * pasan por aquí: sin aceptar no se entra, porque seguir tratando sus datos
 * sin constancia de consentimiento es justo lo que la ley no permite.
 *
 * Se puede salir sin aceptar. Un muro sin salida convierte "no acepto" en
 * "no puedes ni cerrar sesión", que no es una elección real.
 */
export default function LegalGate({
  nuevaVersion,
  onAccept,
  onSignOut,
}: {
  /** True si ya había aceptado antes y lo que cambió es el texto. */
  nuevaVersion: boolean;
  onAccept: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [aceptado, setAceptado] = useState(false);
  const [verDoc, setVerDoc] = useState<LegalDoc["key"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    setLoading(true);
    setError("");
    try {
      await onAccept();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar tu aceptación. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📄</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.text }}>
            {nuevaVersion ? "Actualizamos nuestros términos" : "Antes de continuar"}
          </div>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.55 }}>
            {nuevaVersion
              ? "Cambiamos el aviso de privacidad y los términos. Léelos y acéptalos para seguir usando Millions."
              : "Millions ya tiene aviso de privacidad y términos de uso. Léelos y acéptalos para seguir usando tu cuenta."}
          </div>
        </div>

        <div style={{ ...S.card, padding: 20 }}>
          <div
            onClick={() => setVerDoc("privacidad")}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}22`, cursor: "pointer" }}
          >
            <span style={{ fontSize: T.xl }}>🔒</span>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: C.text }}>Aviso de privacidad</span>
            <span style={{ color: C.aLight, fontSize: T.sm, fontWeight: 600 }}>Leer</span>
          </div>
          <div
            onClick={() => setVerDoc("terminos")}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer" }}
          >
            <span style={{ fontSize: T.xl }}>📄</span>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: C.text }}>Términos y condiciones</span>
            <span style={{ color: C.aLight, fontSize: T.sm, fontWeight: 600 }}>Leer</span>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "18px 0", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={aceptado}
              onChange={(e) => setAceptado(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: C.accent, flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
              He leído y acepto el aviso de privacidad y los términos y condiciones, versión {LEGAL_VERSION}.
            </span>
          </label>

          {error && <ErrorBox>{error}</ErrorBox>}

          <button
            onClick={guardar}
            disabled={!aceptado || loading}
            style={{ ...S.btn(), width: "100%", opacity: !aceptado || loading ? 0.45 : 1, cursor: !aceptado || loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "..." : "Aceptar y continuar"}
          </button>
        </div>

        <button
          onClick={onSignOut}
          style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: T.md, padding: "14px", cursor: "pointer", textDecoration: "underline" }}
        >
          Cerrar sesión
        </button>
      </div>

      {verDoc && <LegalModal doc={verDoc} onClose={() => setVerDoc(null)} />}
    </div>
  );
}
