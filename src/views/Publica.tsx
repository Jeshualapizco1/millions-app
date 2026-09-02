import LegalDocBody from "../components/LegalDocBody";
import { C, R, S, T } from "../lib/constants";
import { CORREO_ARCO, DOMICILIO, GRACIA_DIAS, LEGAL_DOCS, RESPONSABLE } from "../lib/legal";

/** Rutas que se sirven sin sesión. Todo lo demás es la app. */
export const RUTAS_PUBLICAS = ["/privacidad", "/terminos", "/soporte"] as const;
export type RutaPublica = (typeof RUTAS_PUBLICAS)[number];

export const esRutaPublica = (p: string): p is RutaPublica => (RUTAS_PUBLICAS as readonly string[]).includes(p.replace(/\/+$/, "") || "/");

/**
 * Páginas públicas: aviso de privacidad, términos y soporte.
 *
 * Las tiendas exigen una URL de política de privacidad y una de soporte que
 * cualquiera pueda abrir sin cuenta, y la LFPDPPP pide que el aviso esté
 * disponible en todo momento. Antes solo vivían dentro de la app, detrás del
 * login. Mismo texto que el modal: sale de src/lib/legal.ts.
 */
export default function Publica({ ruta }: { ruta: RutaPublica }) {
  const doc = ruta === "/privacidad" ? LEGAL_DOCS[0] : ruta === "/terminos" ? LEGAL_DOCS[1] : null;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}22`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ fontSize: T.xxl, fontWeight: 800, color: C.aLight, letterSpacing: -0.5, textDecoration: "none" }}>Millions</a>
          <nav aria-label="Páginas" style={{ display: "flex", gap: 14, fontSize: T.md }}>
            {([["/privacidad", "Privacidad"], ["/terminos", "Términos"], ["/soporte", "Soporte"]] as const).map(([href, label]) => (
              <a key={href} href={href} aria-current={ruta === href ? "page" : undefined} style={{ color: ruta === href ? C.aLight : C.muted, textDecoration: "none", fontWeight: ruta === href ? 700 : 500 }}>{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        {doc ? (
          <div style={S.card}><LegalDocBody doc={doc} /></div>
        ) : (
          <>
            <div style={S.card}>
              <h1 style={{ fontWeight: 800, fontSize: 19, marginBottom: 6 }}>Soporte</h1>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.muted, margin: "0 0 16px" }}>
                Millions es una app de finanzas personales con captura por voz. Si algo no funciona, tienes una duda o quieres
                ejercer tus derechos sobre tus datos, escríbenos y te contestamos en menos de dos días hábiles.
              </p>
              <a href={`mailto:${CORREO_ARCO}`} style={{ ...S.btn(), display: "inline-block", textDecoration: "none" }}>{CORREO_ARCO}</a>
            </div>

            <div style={S.card}>
              <h2 style={{ fontWeight: 700, fontSize: T.base, color: C.aLight, marginBottom: 8 }}>Tus datos y tu cuenta</h2>
              <ul style={{ fontSize: 13.5, lineHeight: 1.7, color: C.muted, paddingLeft: 18, margin: 0 }}>
                <li><strong style={{ color: C.text }}>Exportar todo:</strong> en la app, Perfil → Exportar todo a CSV. Sale al momento, sin pedirlo.</li>
                <li><strong style={{ color: C.text }}>Borrar tu cuenta:</strong> Perfil → Borrar mi cuenta. Tienes {GRACIA_DIAS} días para arrepentirte; después se elimina todo de forma permanente.</li>
                <li><strong style={{ color: C.text }}>Derechos ARCO</strong> (acceso, rectificación, cancelación y oposición): al correo de arriba, con el correo con el que te registraste.</li>
              </ul>
            </div>

            <div style={{ ...S.card, background: "transparent", border: `1px solid ${C.border}44` }}>
              <h2 style={{ fontWeight: 700, fontSize: T.base, color: C.aLight, marginBottom: 8 }}>Responsable del tratamiento</h2>
              <p style={{ fontSize: T.md, lineHeight: 1.6, color: C.muted, margin: 0 }}>
                {RESPONSABLE}<br />{DOMICILIO}
              </p>
            </div>

            <p style={{ fontSize: T.sm, color: C.muted, textAlign: "center", marginTop: 8 }}>
              <a href="/privacidad" style={{ color: C.aLight }}>Aviso de privacidad</a> · <a href="/terminos" style={{ color: C.aLight }}>Términos y condiciones</a>
            </p>
          </>
        )}
        <p style={{ fontSize: T.sm, color: C.muted, textAlign: "center", marginTop: 24 }}>
          <a href="/" style={{ color: C.aLight, borderRadius: R.sm }}>← Volver a la app</a>
        </p>
      </main>
    </div>
  );
}
