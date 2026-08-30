import { useState } from "react";
import { api } from "../lib/api";
import { CATS } from "../lib/constants";
import type { AiMsg, ChatMsg, TxType } from "../types";

/** Lo que la IA extrae del lenguaje natural para registrar una transacción. */
export interface ParsedTx {
  description: string;
  amount: number;
  type: TxType;
  category?: string;
  accountName?: string;
}

export interface ParsedNewAcc {
  accountName: string;
  balance?: number;
  icon?: string;
}

const AI_GREETING =
  "¡Hola! Soy tu asesor financiero 🤖\n\nAnalizo tus cuentas, gastos, ingresos, créditos, presupuestos y metas.\n\nEjemplos:\n• ¿Cómo voy con mis presupuestos?\n• ¿Cuándo llegaré a mi meta de ahorro?\n• Dame un análisis completo\n• ¿En qué gasto más?";

/** Historial acotado: el costo por llamada deja de crecer con la sesión. */
const CAPTURE_TURNS = 6;
const ADVISE_TURNS = 10;

/**
 * sendTx (captura por voz/texto) y sendAnalysis (asesor). El contexto
 * financiero y el system prompt se construyen en el SERVIDOR; el cliente
 * solo manda los mensajes.
 */
export function useAI({
  applyTx,
  applyNewAcc,
  setTxInput,
  setLive,
}: {
  applyTx: (tx: ParsedTx) => Promise<{ ok: boolean; error?: string }>;
  applyNewAcc: (d: ParsedNewAcc) => Promise<void>;
  setTxInput: (v: string) => void;
  setLive: (v: string) => void;
}) {
  const [txLoading, setTxLoading] = useState(false);
  const [txHistory, setTxHistory] = useState<ChatMsg[]>([]);

  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([{ role: "assistant", text: AI_GREETING }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<ChatMsg[]>([]);

  const sendTx = async (text: string) => {
    if (!text || txLoading) return;
    setTxInput("");
    setLive("");
    setTxLoading(true);
    const newHist = [...txHistory, { role: "user" as const, content: text }].slice(-CAPTURE_TURNS);
    setTxHistory(newHist);
    try {
      const raw = await api.aiCapture(newHist);
      let p: any;
      try {
        p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        p = { action: "ninguna", reply: raw };
      }
      let reply: string = p.reply || "Listo";
      if (p.action === "transaccion" && Number(p.amount) > 0) {
        if (p.category && !CATS[p.category]) p.category = "Otros";
        const r = await applyTx(p);
        if (!r.ok) reply = r.error || "No pude registrar el movimiento";
      } else if (p.action === "nueva_cuenta" && p.accountName) {
        await applyNewAcc({ accountName: p.accountName, balance: p.balance, icon: p.icon });
      }
      setTxHistory([...newHist, { role: "assistant" as const, content: reply }].slice(-CAPTURE_TURNS));
      setLive("✅ " + reply);
      setTimeout(() => setLive(""), 3500);
    } catch (e: any) {
      setLive("❌ " + (e?.message || "Error"));
      setTimeout(() => setLive(""), 3000);
    } finally {
      setTxLoading(false);
    }
  };

  const sendAnalysis = async (text: string) => {
    if (!text || aiLoading) return;
    setAiInput("");
    const newHist = [...aiHistory, { role: "user" as const, content: text }].slice(-ADVISE_TURNS);
    setAiMsgs((m) => [...m, { role: "user", text }]);
    setAiLoading(true);
    try {
      const reply = await api.aiAdvise(newHist);
      setAiHistory([...newHist, { role: "assistant" as const, content: reply }].slice(-ADVISE_TURNS));
      setAiMsgs((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e: any) {
      setAiMsgs((m) => [...m, { role: "assistant", text: e?.message || "Error al conectar." }]);
    } finally {
      setAiLoading(false);
    }
  };

  return { txLoading, sendTx, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis };
}
