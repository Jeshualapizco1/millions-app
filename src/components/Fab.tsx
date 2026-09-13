import { S } from "../lib/constants";
import Modal from "./Modal";
import Icon from "./Icon";
import TxDraftChips from "./TxDraftChips";
import AccDraftChips from "./AccDraftChips";
import type { AccDraft, TxDraft } from "../hooks/useAI";
import { textoAiUso, type AiUso } from "../lib/aiUso";
import type { Account } from "../types";

/** Botón flotante + sheet de captura por voz/texto. */
export default function Fab({
  fab,
  showHint = false,
  onOpen,
  onClose,
  mic, micStarting = false,
  live,
  txLoading,
  txInput,
  setTxInput,
  voiceOK,
  startMic,
  stopMic,
  onSend,
  onAddAccount,
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
  showHint?: boolean;
  onOpen: () => void;
  onClose: () => void;
  mic: boolean; micStarting?: boolean;
  live: string;
  txLoading: boolean;
  txInput: string;
  setTxInput: (v: string) => void;
  voiceOK: boolean;
  startMic: () => void;
  stopMic: () => void;
  onSend: (text: string) => void;
  onAddAccount: () => void;
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

  const close = () => { if (txLoading && (draft || accDraft)) return; stopMic(); onClose(); };
  return <>
    {!fab && <>{showHint && <span className="fab-hint">Habla o escribe</span>}<button className="fab-button" onClick={onOpen} aria-label="Añadir un movimiento" aria-haspopup="dialog"><Icon name="mas" size={28}/></button></>}
    {fab && <Modal onClose={close} dirty={false} busy={txLoading && !!(draft || accDraft)} label="Registrar un movimiento">
      <div className="section-head"><span className="hint">{draft || accDraft ? "Revisa antes de guardar" : "Nuevo movimiento"}</span><button className="text-link" onClick={close} disabled={txLoading && !!(draft || accDraft)}>Cerrar</button></div>
      {!accs.length && !accDraft && <div style={{ marginBottom: 18 }}><p className="hint">Añade una cuenta para indicar de dónde sale o a dónde entra el dinero.</p><button className="text-link" onClick={onAddAccount}>Añadir mi primera cuenta <Icon name="mas" size={16}/></button></div>}
      {accDraft ? <AccDraftChips draft={accDraft} error={draftError} busy={txLoading} update={updateAccDraft} onConfirm={onConfirmAccDraft} onDiscard={onDiscardAccDraft}/>
      : draft ? <TxDraftChips draft={draft} error={draftError} accs={accs} busy={txLoading} update={updateDraft} onConfirm={onConfirmDraft} onDiscard={onDiscardDraft}/>
      : <>
        <div className="voice-mark" data-state={mic ? "escuchando" : txLoading ? "procesando" : "listo"} aria-hidden="true"><i/><i/><i/><i/></div>
        <h2 className="capture-title">{micStarting ? "Preparando el micrófono…" : mic ? "Te escucho." : txLoading ? "Ordenando lo que dijiste…" : "¿Qué registramos?"}</h2>
        <p className="hint" style={{ textAlign: "center" }}>Habla con naturalidad. Tú revisas y confirmas.</p>
        <div className="capture-transcript" role="status" aria-live="polite">{live || (mic ? "Di el monto, en qué fue y tu cuenta." : "")}</div>
        <button onClick={() => { if (mic) { const final = (live || txInput).trim(); stopMic(); if (final) onSend(final); } else startMic(); }} disabled={!voiceOK || micStarting || txLoading || !!uso?.agotado} style={{ ...S.btn(), width: "100%", marginBottom: 20, display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}><Icon name={mic ? "check" : "microfono"}/>{mic ? "Terminar y revisar" : "Registrar por voz"}</button>
        <label htmlFor="capture-text" style={S.lbl}>También puedes escribirlo</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input id="capture-text" style={{ ...S.inp, flex: 1 }} placeholder='Gasté 280 en comida con mi cuenta Nu' value={txInput} disabled={mic || micStarting || txLoading} onChange={(e) => setTxInput(e.target.value)} onKeyDown={(e) => { if(e.key === "Enter" && !e.nativeEvent.isComposing && !mic && !txLoading && !uso?.agotado) onSend(txInput.trim()); }}/><button style={S.btn()} onClick={() => onSend(txInput.trim())} disabled={mic || micStarting || txLoading || !txInput.trim() || !!uso?.agotado} aria-label="Interpretar el movimiento"><Icon name="flecha"/></button></div>
        {!voiceOK && <p className="hint" style={{ marginTop: 12 }}>El dictado no está disponible aquí. Puedes escribir o usar el formulario manual.</p>}
        {uso && <p className="hint" style={{ marginTop: 12 }}>{uso.texto}{uso.agotado ? " Puedes seguir registrando de forma manual." : ""}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}><button style={{ ...S.btnO, flex: 1 }} onClick={onManual}><Icon name="editar" size={18}/> Manual</button><button style={{ ...S.btnO, flex: 1 }} onClick={onTransfer}><Icon name="transferir" size={18}/> Transferir</button></div>
      </>}
    </Modal>}
  </>;
}
