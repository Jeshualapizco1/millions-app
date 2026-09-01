import { useEffect, useRef } from "react";
import { C, R, S, T } from "../lib/constants";
import { describeAction } from "../lib/actions";
import type { ActionContext } from "../lib/actions";
import { textoAiUso, type AiUso } from "../lib/aiUso";
import type { AiMsg, ProposedAction } from "../types";

const QUICK_QUESTIONS = ["¿Cómo voy con mis presupuestos?", "¿Cuál es mi patrimonio neto?", "¿Cómo voy a cerrar el mes?", "Dame recomendaciones", "¿En qué gasto más?"];

const ACTION_LABEL: Record<string, string> = {
  transferir: "Transferir",
  pagar_credito: "Registrar pago",
  registrar_movimiento: "Registrar movimiento",
  crear_presupuesto: "Crear presupuesto",
  abonar_meta: "Abonar a meta",
};

export default function Analisis({
  aiMsgs,
  aiLoading,
  aiInput,
  setAiInput,
  onSend,
  actionContext,
  onConfirmAction,
  onDismissAction,
  aiUso,
}: {
  aiMsgs: AiMsg[];
  aiLoading: boolean;
  aiInput: string;
  setAiInput: (v: string) => void;
  onSend: (text: string) => void;
  actionContext: () => ActionContext;
  onConfirmAction: (a: ProposedAction) => void;
  onDismissAction: (a: ProposedAction) => void;
  /** Consumo del día; null mientras no se sepa. */
  aiUso: AiUso | null;
}) {
  const uso = textoAiUso(aiUso);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);
  return (
    <div className="fadeUp">
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>🤖 Asesor Financiero</div>
        <div style={{ fontSize: T.md, color: C.muted, marginBottom: uso ? 6 : 14 }}>Analizo cuentas, gastos, créditos, presupuestos y metas en tiempo real.</div>
        {/* Que nadie se entere del tope por un error: el número va a la vista
            y cuenta también la captura por voz, que pasa por la misma puerta. */}
        {uso && (
          <div style={{ fontSize: T.sm, color: uso.agotado ? C.amber : C.muted, marginBottom: 14, fontWeight: uso.agotado ? 600 : 400 }}>
            {uso.agotado ? "⏳ " : ""}{uso.texto}{uso.agotado ? "" : " Cuentan también las capturas por voz."}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => onSend(q)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.lg, padding: "6px 12px", fontSize: T.sm, color: C.aLight, cursor: "pointer" }}>{q}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 200, maxHeight: 400, overflowY: "auto", marginBottom: 14 }}>
          {aiMsgs.map((m, i) => (
            <div key={i} className="msg" style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              <div style={{ maxWidth: "85%", background: m.role === "user" ? C.accent : C.surface, border: m.role === "assistant" ? `1px solid ${C.border}44` : "none", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: T.base, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
              {m.action && <ActionCard action={m.action} resolved={m.resolved} busy={aiLoading} actionContext={actionContext} onConfirm={onConfirmAction} onDismiss={onDismissAction} />}
            </div>
          ))}
          {aiLoading && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ background: C.surface, border: `1px solid ${C.border}44`, borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: T.base, color: C.muted }}>Analizando…</div></div>}
          <div ref={endRef} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input style={{ ...S.inp, flex: 1 }} placeholder="Pregunta sobre tus finanzas…" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSend(aiInput.trim())} />
          <button style={{ ...S.btn(), padding: "12px 16px" }} onClick={() => onSend(aiInput.trim())} disabled={aiLoading || !aiInput.trim()}>↑</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de confirmación. Nada se ejecuta hasta que la persona toca el botón:
 * la IA propone, la persona decide.
 */
function ActionCard({
  action,
  resolved,
  busy,
  actionContext,
  onConfirm,
  onDismiss,
}: {
  action: ProposedAction;
  resolved?: "hecho" | "descartado" | "en_curso";
  /** Mientras algo corre, ninguna tarjeta acepta toques. */
  busy: boolean;
  actionContext: () => ActionContext;
  onConfirm: (a: ProposedAction) => void;
  onDismiss: (a: ProposedAction) => void;
}) {
  let detalle: string;
  try {
    detalle = describeAction(action, actionContext());
  } catch (e: any) {
    detalle = e?.message || "No se pudo preparar la acción";
    resolved = resolved ?? "descartado";
  }

  const hecho = resolved === "hecho";
  const enCurso = resolved === "en_curso";
  const borde = hecho ? C.green : enCurso ? C.accent : resolved ? C.border : C.accent;

  return (
    <div style={{ maxWidth: "85%", width: "100%", background: C.card, border: `1px solid ${borde}66`, borderLeft: `3px solid ${borde}`, borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: T.xs, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>
        {hecho ? "✅ Hecho" : enCurso ? "⏳ Ejecutando…" : resolved ? "Descartado" : "Confirma para continuar"}
      </div>
      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap", marginBottom: resolved ? 0 : 12 }}>{detalle}</div>
      {!resolved && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onDismiss(action)} disabled={busy} style={{ ...S.btnO, flex: 1, padding: "9px 14px", fontSize: T.md, opacity: busy ? 0.5 : 1 }}>No</button>
          <button onClick={() => onConfirm(action)} disabled={busy} style={{ ...S.btn(), flex: 2, padding: "9px 14px", fontSize: T.md, opacity: busy ? 0.5 : 1 }}>
            {ACTION_LABEL[action.name] ?? "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
