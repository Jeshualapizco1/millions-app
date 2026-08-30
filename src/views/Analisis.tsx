import { useEffect, useRef } from "react";
import { C, S } from "../lib/constants";
import type { AiMsg } from "../types";

const QUICK_QUESTIONS = ["¿Cómo voy con mis presupuestos?", "¿Cuándo alcanzaré mis metas?", "Dame recomendaciones", "Analiza mi situación completa", "¿En qué gasto más?"];

export default function Analisis({
  aiMsgs,
  aiLoading,
  aiInput,
  setAiInput,
  onSend,
}: {
  aiMsgs: AiMsg[];
  aiLoading: boolean;
  aiInput: string;
  setAiInput: (v: string) => void;
  onSend: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMsgs]);
  return (
    <div className="fadeUp">
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>🤖 Asesor Financiero</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Analizo cuentas, gastos, créditos, presupuestos y metas en tiempo real.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => onSend(q)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, color: C.aLight, cursor: "pointer" }}>{q}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 200, maxHeight: 400, overflowY: "auto", marginBottom: 14 }}>
          {aiMsgs.map((m, i) => (
            <div key={i} className="msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "85%", background: m.role === "user" ? C.accent : C.surface, border: m.role === "assistant" ? `1px solid ${C.border}44` : "none", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))}
          {aiLoading && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ background: C.surface, border: `1px solid ${C.border}44`, borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 14, color: C.muted }}>Analizando…</div></div>}
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
