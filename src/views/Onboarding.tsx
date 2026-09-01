import { useState } from "react";
import Confeti from "../components/Confeti";
import { C, S } from "../lib/constants";
import { bienvenida, PREGUNTAS, RESPUESTAS_VACIAS, type Respuestas } from "../lib/onboarding";

/**
 * Arranque guiado del usuario nuevo.
 *
 * Cinco preguntas sobre lo que la persona busca —no sobre sus números— y una
 * pantalla de cierre que le devuelve sus propias respuestas. Pedir saldos y
 * sueldo aquí sería pedir datos que nadie trae a la mano en el primer minuto,
 * y es donde la gente abandona.
 *
 * Se puede saltar. Un segundo muro justo después del portón legal convertiría
 * la bienvenida en un trámite; quien lo salte verá el recordatorio en el
 * tablero vacío, que es un lugar mucho mejor para pedirlo.
 */
export default function Onboarding({
  nombre,
  onFinish,
  onSkip,
  onConfigurar,
  onExplorar,
}: {
  nombre: string;
  /**
   * Guarda las respuestas en la base. NO cierra la pantalla: si lo hiciera, el
   * cierre personalizado se pintaria y desapareceria en el mismo instante, que
   * es justo la parte que hace que el arranque valga la pena.
   */
  onFinish: (r: Respuestas) => Promise<void>;
  /** "Ahora no": deja constancia de que ya lo vio y cierra. */
  onSkip: () => Promise<void>;
  /** "Configurar mis cuentas": pasa al arranque de configuracion. */
  onConfigurar: () => void;
  /** "Prefiero explorar": cierra sin configurar. Las respuestas ya se guardaron. */
  onExplorar: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const [r, setR] = useState<Respuestas>(RESPUESTAS_VACIAS);
  const [cierre, setCierre] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const total = PREGUNTAS.length;
  const p = PREGUNTAS[paso];

  const guardar = async (final: Respuestas) => {
    setGuardando(true);
    setError("");
    try {
      await onFinish(final);
      setCierre(true);
    } catch (e: any) {
      setError(e?.message || "No se pudieron guardar tus respuestas. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  /** Avanza, y si era la última pregunta cierra el cuestionario. */
  const avanzar = (siguiente: Respuestas) => {
    setR(siguiente);
    if (paso + 1 < total) setPaso(paso + 1);
    else void guardar(siguiente);
  };

  const saltar = async () => {
    setGuardando(true);
    setError("");
    try {
      await onSkip();
    } catch (e: any) {
      setError(e?.message || "No se pudo continuar. Inténtalo de nuevo.");
      setGuardando(false);
    }
  };

  // ── Pantalla de cierre ────────────────────────────────────────────────────
  if (cierre) {
    const b = bienvenida(nombre, r);
    return (
      <Marco>
        <Confeti />
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 23, fontWeight: 800, color: C.text, lineHeight: 1.25 }}>{b.titulo}</div>
        </div>
        <div style={{ ...S.card, padding: 22, display: "flex", flexDirection: "column", gap: 15 }}>
          {b.parrafos.map((t, i) => (
            <div
              key={i}
              style={{
                fontSize: 14.5,
                lineHeight: 1.6,
                // El párrafo de su respuesta abierta lleva su propia voz, así
                // que se distingue del resto en vez de mezclarse con el copy.
                color: t.startsWith("Y esto que escribiste") ? C.aLight : C.muted,
                whiteSpace: "pre-line",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        {/* Configurar es la oferta, no el peaje. Llega despues de que la
            persona ya se sintio escuchada, que es cuando pedir sus numeros
            deja de sentirse como un tramite de entrada. */}
        <button onClick={onConfigurar} style={{ ...S.btn(), width: "100%", marginTop: 4 }}>
          Configurar mis cuentas
        </button>
        <button
          onClick={onExplorar}
          style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: 13, padding: 14, cursor: "pointer" }}
        >
          Prefiero explorar primero
        </button>
      </Marco>
    );
  }

  // ── Preguntas ─────────────────────────────────────────────────────────────
  const seleccionadas = p.field === "pains" ? r.pains : [];

  return (
    <Marco>
      {/* Progreso: cinco barritas. Saber cuánto falta es la diferencia entre
          contestar y abandonar a la mitad. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
        {PREGUNTAS.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= paso ? C.accent : C.border,
              transition: "background 0.25s",
            }}
          />
        ))}
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>
          Pregunta {paso + 1} de {total}
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{p.hint}</div>
      </div>

      {p.kind === "texto" ? (
        <>
          <textarea
            value={r.dream}
            onChange={(e) => setR({ ...r, dream: e.target.value.slice(0, 2000) })}
            placeholder={p.placeholder}
            rows={4}
            autoFocus
            style={{ ...S.inp, resize: "none", lineHeight: 1.5, fontFamily: "inherit" }}
          />
          <button
            onClick={() => avanzar(r)}
            disabled={guardando}
            style={{ ...S.btn(), width: "100%", marginTop: 14, opacity: guardando ? 0.5 : 1 }}
          >
            {guardando ? "..." : r.dream.trim() ? "Continuar" : "Prefiero no contestar"}
          </button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {(p.options ?? []).map((o) => {
            const activa = p.field === "pains" ? seleccionadas.includes(o.key) : r[p.field] === o.key;
            return (
              <button
                key={o.key}
                onClick={() => {
                  if (p.field === "pains") {
                    // Varias: alterna y espera al botón de continuar.
                    const next = activa ? r.pains.filter((x) => x !== o.key) : [...r.pains, o.key];
                    setR({ ...r, pains: next });
                  } else {
                    // Una sola: tocar es contestar y avanzar. Un botón de
                    // "siguiente" aquí sería un toque de más por pantalla.
                    avanzar({ ...r, [p.field]: o.key });
                  }
                }}
                disabled={guardando}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  width: "100%",
                  textAlign: "left",
                  background: activa ? C.accent + "22" : C.card,
                  border: `1px solid ${activa ? C.accent : C.border + "22"}`,
                  borderRadius: 14,
                  padding: "15px 16px",
                  cursor: guardando ? "default" : "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <span style={{ fontSize: 21, flexShrink: 0 }}>{o.emoji}</span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: activa ? C.text : C.text + "cc" }}>
                  {o.label}
                </span>
                {p.field === "pains" && (
                  <span style={{ fontSize: 15, color: activa ? C.accent : C.border, flexShrink: 0 }}>
                    {activa ? "●" : "○"}
                  </span>
                )}
              </button>
            );
          })}

          {p.field === "pains" && (
            <button
              onClick={() => avanzar(r)}
              disabled={guardando || r.pains.length === 0}
              style={{
                ...S.btn(),
                width: "100%",
                marginTop: 6,
                opacity: guardando || r.pains.length === 0 ? 0.45 : 1,
                cursor: guardando || r.pains.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {guardando ? "..." : "Continuar"}
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            background: C.red + "18",
            border: `1px solid ${C.red}44`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: C.red,
            marginTop: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        {paso > 0 ? (
          <button
            onClick={() => setPaso(paso - 1)}
            disabled={guardando}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 13, padding: 14, cursor: "pointer" }}
          >
            ‹ Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => void saltar()}
          disabled={guardando}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 13, padding: 14, cursor: "pointer", textDecoration: "underline" }}
        >
          Ahora no
        </button>
      </div>
    </Marco>
  );
}

/** Mismo encuadre que el portón legal, para que las dos pantallas de entrada se sientan una. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: C.bg,
        padding: "24px 24px calc(env(safe-area-inset-bottom,0px) + 24px)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
