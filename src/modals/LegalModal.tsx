import { useState } from "react";
import Modal from "../components/Modal";
import { C } from "../lib/constants";
import { LEGAL_DOCS, LEGAL_VERSION, type LegalDoc } from "../lib/legal";

/**
 * Muestra el aviso de privacidad y los términos.
 *
 * Se abre desde el registro (antes de haber sesión) y desde Perfil, así que no
 * puede depender de nada que venga de la base: todo el texto es estático.
 *
 * Las dos pestañas viven en el mismo modal porque quien va a leer uno suele
 * querer ojear el otro, y cerrar para volver a abrir es fricción de más
 * justo en el momento en que le estamos pidiendo que acepte.
 */
export default function LegalModal({
  doc,
  onClose,
}: {
  doc: LegalDoc["key"];
  onClose: () => void;
}) {
  const [activo, setActivo] = useState<LegalDoc["key"]>(doc);
  const actual = LEGAL_DOCS.find((d) => d.key === activo) ?? LEGAL_DOCS[0];

  return (
    <Modal onClose={onClose}>
      <div style={{ color: C.text }}>
        <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 4, marginBottom: 18 }}>
          {LEGAL_DOCS.map((d) => (
            <button
              key={d.key}
              onClick={() => setActivo(d.key)}
              style={{
                flex: 1,
                padding: "9px 6px",
                borderRadius: 10,
                border: "none",
                background: activo === d.key ? C.accent : "transparent",
                color: activo === d.key ? "#fff" : C.muted,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {d.key === "privacidad" ? "Privacidad" : "Términos"}
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 4 }}>{actual.title}</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>Versión {LEGAL_VERSION}</div>

        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.text, margin: "0 0 20px" }}>{actual.intro}</p>

        {actual.sections.map((s) => (
          <div key={s.title} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.aLight, marginBottom: 7 }}>{s.title}</div>
            {s.body.map((p, i) => (
              <p key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: C.muted, margin: "0 0 8px" }}>{p}</p>
            ))}
          </div>
        ))}

        <button
          onClick={onClose}
          style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 6 }}
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
