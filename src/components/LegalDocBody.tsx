import { C, T } from "../lib/constants";
import { LEGAL_VERSION, type LegalDoc } from "../lib/legal";

/**
 * El cuerpo de un documento legal: título, versión, intro y secciones.
 * Lo usan el modal de dentro de la app y las páginas públicas que exigen las
 * tiendas, para que nunca haya dos versiones del mismo texto.
 */
export default function LegalDocBody({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <h1 style={{ fontWeight: 800, fontSize: 19, marginBottom: 4, color: C.text }}>{doc.title}</h1>
      <div style={{ fontSize: T.xs, color: C.muted, marginBottom: 14 }}>Versión {LEGAL_VERSION}</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.text, margin: "0 0 20px" }}>{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.title} style={{ marginBottom: 18 }}>
          <h2 style={{ fontWeight: 700, fontSize: T.base, color: C.aLight, marginBottom: 7 }}>{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: C.muted, margin: "0 0 8px" }}>{p}</p>
          ))}
        </section>
      ))}
    </>
  );
}
