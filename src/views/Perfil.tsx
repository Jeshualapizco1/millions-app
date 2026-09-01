import { useState } from "react";
import { C, S } from "../lib/constants";
import { exportCSV } from "../lib/csv";
import { consultasRestantes, type AiUso } from "../lib/aiUso";
import { diasRestantesDeGracia, diasRestantesDePlazo } from "../lib/dates";
import { GRACIA_DIAS, LEGAL_VERSION, PRUEBA_DIAS, type LegalDoc } from "../lib/legal";
import LegalModal from "../modals/LegalModal";
import type { Profile, Transaction } from "../types";

/**
 * Perfil: la cuenta, los datos y lo legal en un solo lugar.
 *
 * Existe porque la ley obliga a que el aviso de privacidad y el borrado de
 * cuenta estén siempre a la mano, y el header no daba para más botones.
 *
 * Las acciones con efecto (contraseña, salir, borrar) se delegan a App, que es
 * quien ya administra los modales y los toasts. Aquí solo vive el visor de
 * documentos, que no toca nada.
 */

const fechaLarga = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—";

function Fila({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: string;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 4px",
        cursor: "pointer",
        borderBottom: `1px solid ${C.border}22`,
      }}
    >
      <span style={{ fontSize: 19, width: 24, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{hint}</div>}
      </div>
      <span style={{ color: C.muted, fontSize: 18 }}>›</span>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>
        {titulo}
      </div>
      <div style={{ ...S.card, padding: "2px 14px", marginBottom: 0 }}>{children}</div>
    </div>
  );
}

export default function Perfil({
  profile,
  email,
  txs,
  onChangePassword,
  onSignOut,
  onDeleteAccount,
  onCancelDeletion,
  aiUso,
}: {
  profile: Profile | null;
  email: string;
  txs: Transaction[];
  onChangePassword: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onCancelDeletion: () => void;
  /** Consumo de IA del día; null mientras no se sepa. */
  aiUso: AiUso | null;
}) {
  const [verDoc, setVerDoc] = useState<LegalDoc["key"] | null>(null);
  const nombre = profile?.name || email.split("@")[0];
  const diasParaBorrado = diasRestantesDeGracia(profile?.deletion_requested_at, GRACIA_DIAS);
  const enBorrado = diasParaBorrado !== null;
  const desactualizado = !!profile?.legal_accepted_at && profile.legal_version !== LEGAL_VERSION;
  // Aquí sí se muestra siempre: arriba solo aparece la última semana, y este
  // es el lugar donde alguien va a buscarlo cuando se acuerde de preguntar.
  const diasDePrueba = diasRestantesDePlazo(profile?.created_at, PRUEBA_DIAS);

  return (
    <div className="fadeUp">
      {/* Encabezado */}
      <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg,${C.accent},#9333ea)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {nombre.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</div>
          <div style={{ fontSize: 12.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
          {profile?.created_at && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>Miembro desde {fechaLarga(profile.created_at)}</div>
          )}
        </div>
      </div>

      {/* La solicitud de baja manda sobre todo lo demás: si está activa, es lo
          primero que hay que ver y hay que poder deshacerla de un toque. */}
      {enBorrado && (
        <div style={{ ...S.card, background: C.red + "18", border: `1px solid ${C.red}44` }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.red, marginBottom: 6 }}>
            Tu cuenta se borrará {diasParaBorrado === 0 ? "hoy" : `en ${diasParaBorrado} ${diasParaBorrado === 1 ? "día" : "días"}`}
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
            Pediste la baja el {fechaLarga(profile?.deletion_requested_at)}. Mientras tanto puedes seguir usando Millions con normalidad.
            Cuando se cumpla el plazo se eliminarán tus movimientos, cuentas, créditos, presupuestos y metas, sin posibilidad de recuperarlos.
          </div>
          <button style={{ ...S.btn(), width: "100%" }} onClick={onCancelDeletion}>
            Cancelar el borrado
          </button>
        </div>
      )}

      {diasDePrueba !== null && (
        <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>{diasDePrueba > 7 ? "🎁" : "⏳"}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: diasDePrueba > 7 ? C.text : C.amber }}>
              {diasDePrueba === 0
                ? "Tu prueba terminó"
                : diasDePrueba === 1
                ? "Tu prueba termina mañana"
                : `Te quedan ${diasDePrueba} días de prueba`}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>
              {PRUEBA_DIAS} días gratis desde tu alta. Al terminar podrás exportar tus
              datos aunque no continúes.
            </div>
          </div>
        </div>
      )}

      <Seccion titulo="Cuenta">
        <Fila icon="🔑" label="Cambiar contraseña" hint="Mínimo 8 caracteres" onClick={onChangePassword} />
        <Fila icon="↩" label="Cerrar sesión" onClick={onSignOut} />
      </Seccion>

      {aiUso && (
        <Seccion titulo="Asistente">
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 4px" }}>
            <span style={{ fontSize: 19, width: 24, textAlign: "center" }}>🤖</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>
                {consultasRestantes(aiUso)} de {aiUso.tope} consultas disponibles hoy
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Captura por voz y asesor. Se renuevan a medianoche.
              </div>
            </div>
          </div>
        </Seccion>
      )}

      <Seccion titulo="Tus datos">
        <Fila
          icon="📤"
          label="Exportar todo a CSV"
          hint={`${txs.length} ${txs.length === 1 ? "movimiento" : "movimientos"} · se abre en Excel`}
          onClick={() => exportCSV(txs)}
        />
      </Seccion>

      <Seccion titulo="Legal">
        <Fila icon="🔒" label="Aviso de privacidad" onClick={() => setVerDoc("privacidad")} />
        <Fila icon="📄" label="Términos y condiciones" onClick={() => setVerDoc("terminos")} />
      </Seccion>

      {profile?.legal_accepted_at && (
        <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", padding: "0 12px 18px", lineHeight: 1.5 }}>
          Aceptaste la versión {profile.legal_version} el {fechaLarga(profile.legal_accepted_at)}.
          {desactualizado && " Hay una versión más reciente; te la pediremos la próxima vez que entres."}
        </div>
      )}

      {/* Fuera de las secciones y en rojo: borrar la cuenta no debe parecerse a
          las demás filas ni quedar a un toque de distancia por accidente. */}
      {!enBorrado && (
        <div style={{ ...S.card, border: `1px solid ${C.red}33` }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.red, marginBottom: 6 }}>Borrar mi cuenta</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
            Se elimina todo de forma permanente a los {GRACIA_DIAS} días. Durante ese plazo puedes arrepentirte.
            Exporta tus movimientos antes: después no se pueden recuperar.
          </div>
          <button
            onClick={onDeleteAccount}
            style={{ width: "100%", background: "transparent", color: C.red, border: `1px solid ${C.red}66`, borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Borrar mi cuenta
          </button>
        </div>
      )}

      {verDoc && <LegalModal doc={verDoc} onClose={() => setVerDoc(null)} />}
    </div>
  );
}
