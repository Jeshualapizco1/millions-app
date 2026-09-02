import { useState } from "react";
import Modal from "../components/Modal";
import { C, R, T } from "../lib/constants";
import LegalDocBody from "../components/LegalDocBody";
import { LEGAL_DOCS, type LegalDoc } from "../lib/legal";

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
        <div style={{ display: "flex", background: C.surface, borderRadius: R.md, padding: 4, marginBottom: 18 }}>
          {LEGAL_DOCS.map((d) => (
            <button
              key={d.key}
              onClick={() => setActivo(d.key)}
              style={{
                flex: 1,
                padding: "9px 6px",
                borderRadius: R.sm,
                border: "none",
                background: activo === d.key ? C.accent : "transparent",
                color: activo === d.key ? "#fff" : C.muted,
                fontWeight: 700,
                fontSize: T.md,
                cursor: "pointer",
              }}
            >
              {d.key === "privacidad" ? "Privacidad" : "Términos"}
            </button>
          ))}
        </div>

        <LegalDocBody doc={actual} />

        <button
          onClick={onClose}
          style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: R.md, padding: "13px", fontSize: T.base, fontWeight: 700, cursor: "pointer", marginTop: 6 }}
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
