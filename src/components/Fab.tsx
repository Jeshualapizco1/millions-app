import { C, S } from "../lib/constants";
import TxDraftChips from "./TxDraftChips";
import AccDraftChips from "./AccDraftChips";
import type { AccDraft, TxDraft } from "../hooks/useAI";
import { textoAiUso, type AiUso } from "../lib/aiUso";
import type { Account } from "../types";

/** Botón flotante + sheet de captura por voz/texto. */
export default function Fab({
  fab,
  onOpen,
  onClose,
  mic,
  live,
  txLoading,
  txInput,
  setTxInput,
  voiceOK,
  startMic,
  stopMic,
  onSend,
  onManual,
  onTransfer,
  accs,
  draft,
  draftError,
  updateDraft,
  onConfirmDraft,
  onDiscardDraft,
  accDraft,
  updateAccDraft,
  onConfirmAccDraft,
  onDiscardAccDraft,
  aiUso,
}: {
  fab: boolean;
  onOpen: () => void;
  onClose: () => void;
  mic: boolean;
  live: string;
  txLoading: boolean;
  txInput: string;
  setTxInput: (v: string) => void;
  voiceOK: boolean;
  startMic: () => void;
  stopMic: () => void;
  onSend: (text: string) => void;
  onManual: () => void;
  onTransfer: () => void;
  accs: Account[];
  /** Lo capturado esperando confirmación. Mientras exista, manda la pantalla. */
  draft: TxDraft | null;
  draftError: string | null;
  updateDraft: (patch: Partial<TxDraft>) => void;
  onConfirmDraft: () => void;
  onDiscardDraft: () => void;
  /** Una cuenta dictada esperando confirmación. Manda igual que el borrador de movimiento. */
  accDraft: AccDraft | null;
  updateAccDraft: (patch: Partial<AccDraft>) => void;
  onConfirmAccDraft: () => void;
  onDiscardAccDraft: () => void;
  /** Consumo de IA del día; null mientras no se sepa. */
  aiUso: AiUso | null;
}) {
  const uso = textoAiUso(aiUso);
  return (
    <>
      {/* FAB */}
      {!fab && <button onClick={onOpen} style={{ position: "fixed", bottom: `calc(env(safe-area-inset-bottom,0px) + 80px)`, right: 20, width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},#9333ea)`, border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 8px 24px #7c6af755", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>＋</button>}

      {/* FAB Sheet */}
      {fab && (
        // Con un borrador en pantalla, tocar el fondo NO cierra: se perdería
        // lo capturado sin que nadie lo decidiera. Hay que guardar o descartar.
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end", animation: "fadeIn 0.15s ease" }} onClick={() => { if (draft || accDraft) return; stopMic(); onClose(); }}>
          <div style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: "20px", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 20px)", animation: "slideUp 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />

            {accDraft ? (
              <AccDraftChips
                draft={accDraft}
                error={draftError}
                busy={txLoading}
                update={updateAccDraft}
                onConfirm={onConfirmAccDraft}
                onDiscard={onDiscardAccDraft}
              />
            ) : draft ? (
              <TxDraftChips
                draft={draft}
                error={draftError}
                accs={accs}
                busy={txLoading}
                update={updateDraft}
                onConfirm={onConfirmDraft}
                onDiscard={onDiscardDraft}
              />
            ) : (
            <>
            {mic && <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: C.red, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, display: "inline-block", animation: "pulse 1s infinite" }} />{live || "Escuchando…"}</div>}
            {!mic && live && <div style={{ background: C.green + "18", border: `1px solid ${C.green}44`, borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: C.green }}>{live}</div>}
            {txLoading && <div style={{ textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 14 }}>Procesando…</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
              <button onClick={mic ? stopMic : startMic} disabled={!voiceOK || txLoading} style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, border: `2px solid ${mic ? C.red : C.accent}`, background: mic ? C.red + "22" : C.accent + "22", color: mic ? C.red : C.aLight, fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", animation: mic ? "pulse 1.2s ease-in-out infinite" : "none" }}>
                {mic ? "⏹" : "🎙️"}
              </button>
              <input style={{ ...S.inp, flex: 1 }} placeholder='Di o escribe: "Gasté $200 en el Ley"' value={txInput} onChange={(e) => setTxInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSend(txInput.trim())} />
              <button style={{ ...S.btn(), padding: "12px 14px" }} onClick={() => onSend(txInput.trim())} disabled={txLoading || !txInput.trim()}>↑</button>
            </div>
            {!voiceOK && <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, textAlign: "center" }}>El dictado por voz no está disponible en este navegador. En iPhone usa Safari; en Android o escritorio, Chrome.</div>}
            {/* Aquí es donde se gasta: que el tope no sorprenda en la llamada 16.
                Si se acabó, el botón manual de abajo sigue siendo la salida. */}
            {uso && (
              <div style={{ fontSize: 11, color: uso.agotado ? C.amber : C.muted, marginBottom: 14, textAlign: "center", fontWeight: uso.agotado ? 600 : 400 }}>
                {uso.agotado ? `⏳ ${uso.texto} Mientras tanto, registra a mano.` : uso.texto}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><div style={{ flex: 1, height: 1, background: C.border }} /><span style={{ fontSize: 12, color: C.muted }}>o</span><div style={{ flex: 1, height: 1, background: C.border }} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.btn(`${C.accent}22`), flex: 1, color: C.aLight, border: `1px solid ${C.accent}44` }} onClick={onManual}>✏️ Manual</button>
              <button style={{ ...S.btn(`${C.accent}22`), flex: 1, color: C.aLight, border: `1px solid ${C.accent}44` }} onClick={onTransfer}>↔️ Transferir</button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
