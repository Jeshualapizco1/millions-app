import { useRef, useState } from "react";
import ErrorBox from "../components/ErrorBox";
import { C, S, T } from "../lib/constants";
import { PREGUNTAS, RESPUESTAS_VACIAS, type Respuestas } from "../lib/onboarding";

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
}) {
  const [paso, setPaso] = useState(0);
  const [r, setR] = useState<Respuestas>(RESPUESTAS_VACIAS);
  const lock = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const total = PREGUNTAS.length;
  const p = PREGUNTAS[paso];

  const guardar = async (final: Respuestas) => {
    if (lock.current) return; lock.current = true;
    setGuardando(true);
    setError("");
    try {
      await onFinish(final);

    } catch (e: any) {
      setError(e?.message || "No se pudieron guardar tus respuestas. Inténtalo de nuevo.");
    } finally {
      lock.current = false;
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
    if (lock.current) return; lock.current = true;
    setGuardando(true);
    setError("");
    try {
      await onSkip();
    } catch (e: any) {
      setError(e?.message || "No se pudo continuar. Inténtalo de nuevo.");
      lock.current = false;
      setGuardando(false);
    }
  };

  // ── Preguntas ─────────────────────────────────────────────────────────────
  const seleccionadas = p.field === "pains" ? r.pains : [];

  return (
    <Marco>
      <p className="hint" style={{ marginBottom: 16 }}>{nombre.split(" ")[0]}, empecemos por lo que te importa.</p>
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
        <div style={{ fontSize: T.sm, color: C.muted, fontWeight: 600, marginBottom: 8 }}>
          Pregunta {paso + 1} de {total}
        </div>
        <h1 style={{ fontSize: 28 }}>{p.title}</h1>
        <div style={{ fontSize: T.md, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{p.hint}</div>
      </div>

      {p.kind === "texto" ? (
        <>
          <textarea
            aria-label={p.title}
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
                aria-pressed={activa}
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
                <span style={{ flex: 1, fontSize: T.base, fontWeight: 600, color: activa ? C.text : C.text + "cc" }}>
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

      {error && <ErrorBox style={{ marginTop: 14, marginBottom: 0 }}>{error}</ErrorBox>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        {paso > 0 ? (
          <button
            onClick={() => setPaso(paso - 1)}
            disabled={guardando}
            style={{ background: "none", border: "none", color: C.muted, fontSize: T.md, padding: 14, cursor: "pointer" }}
          >
            ‹ Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => void saltar()}
          disabled={guardando}
          style={{ background: "none", border: "none", color: C.muted, fontSize: T.md, padding: 14, cursor: "pointer", textDecoration: "underline" }}
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
