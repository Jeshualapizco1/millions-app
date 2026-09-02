import { useState } from "react";
import LegalModal from "../modals/LegalModal";
import { C, S, T } from "../lib/constants";
import { exportCSV } from "../lib/csv";
import { CONTACTO_PAGO, COBRO_INCOMPLETO, PRECIO_TEXTO, PRUEBA_DIAS } from "../lib/legal";
import type { Transaction } from "../types";

/**
 * Muro de fin de prueba.
 *
 * Bloquea el uso de la aplicación, no el acceso a los datos. Las tres salidas
 * de abajo no son cortesía: los términos prometen que aunque no continúes
 * puedes exportar tus movimientos, leer el aviso y borrar tu cuenta, y el
 * derecho de acceso y cancelación de la LFPDPPP no se suspende porque se haya
 * acabado una promoción. Un muro sin salida convertiría "no pago" en "no
 * puedes ni sacar lo tuyo".
 */
export default function FinDePrueba({
  txs,
  totalTxs,
  historialCompleto,
  onCargarTodo,
  onSignOut,
  onDeleteAccount,
}: {
  txs: Transaction[];
  /** El total de verdad: aquí se promete que los datos siguen completos. */
  totalTxs: number;
  historialCompleto: boolean;
  onCargarTodo: () => Promise<unknown>;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  const [verDoc, setVerDoc] = useState<"privacidad" | "terminos" | null>(null);

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 480, width: "100%", margin: "0 auto", padding: "calc(env(safe-area-inset-top,0px) + 40px) 20px 32px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 46, textAlign: "center", marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: T.hero, fontWeight: 800, letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>
          Se terminaron tus {PRUEBA_DIAS} días
        </div>
        <div style={{ fontSize: T.base, color: C.muted, lineHeight: 1.55, textAlign: "center", marginBottom: 26 }}>
          Tus {totalTxs} movimientos siguen aquí, intactos. Para volver a usar la
          aplicación necesitas un plan de pago.
        </div>

        <div style={{ ...S.card, textAlign: "center" }}>
          {COBRO_INCOMPLETO ? (
            // Sin precio ni contacto reales, decirlo es mejor que inventarlo.
            <div style={{ fontSize: T.md, color: C.amber, lineHeight: 1.5 }}>
              Falta configurar el precio y el medio de contratación
              (<code>PRECIO_TEXTO</code> y <code>CONTACTO_PAGO</code> en <code>src/lib/legal.ts</code>).
            </div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>{PRECIO_TEXTO}</div>
              <a
                href={CONTACTO_PAGO.includes("@") ? `mailto:${CONTACTO_PAGO}` : CONTACTO_PAGO}
                style={{ ...S.btn(), display: "block", textDecoration: "none", textAlign: "center" }}
              >
                Continuar con Millions
              </a>
            </>
          )}
        </div>

        {/* Las salidas. Siempre disponibles, con o sin plan. */}
        <div style={{ ...S.card, marginTop: 4 }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Tus datos son tuyos y siguen a tu alcance:
          </div>
          {/* Esta pantalla promete que los datos siguen enteros: el archivo no
              sale hasta que el historial completo está cargado. */}
          <button
            style={{ ...S.btnO, width: "100%", marginBottom: 8 }}
            onClick={() => (historialCompleto ? exportCSV(txs) : void onCargarTodo())}
          >
            {historialCompleto ? "⬇ Exportar mis movimientos a CSV" : "Preparando tu historial…"}
          </button>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button style={{ ...S.btnO, flex: 1, fontSize: T.md }} onClick={() => setVerDoc("privacidad")}>🔒 Aviso</button>
            <button style={{ ...S.btnO, flex: 1, fontSize: T.md }} onClick={() => setVerDoc("terminos")}>📄 Términos</button>
          </div>
          <button style={{ ...S.btnO, width: "100%" }} onClick={onSignOut}>↩ Cerrar sesión</button>
        </div>

        <button
          onClick={onDeleteAccount}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 12.5, cursor: "pointer", padding: "14px 0 0", textAlign: "center" }}
        >
          Borrar mi cuenta y todos mis datos
        </button>
      </div>

      {verDoc && <LegalModal doc={verDoc} onClose={() => setVerDoc(null)} />}
    </div>
  );
}
