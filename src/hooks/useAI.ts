import { useState } from "react";
import { api } from "../lib/api";
import { describeAction, runAction, type ActionContext } from "../lib/actions";
import type { AiMsg, ChatMsg, ProposedAction, TxType } from "../types";

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
  "¡Hola! Soy tu asesor financiero 🤖\n\nAnalizo tus cuentas, gastos, ingresos, créditos, presupuestos y metas — y puedo hacer cosas por ti.\n\nEjemplos:\n• ¿Cómo voy con mis presupuestos?\n• Transfiere 2000 de Efectivo a BanRegio\n• Pon un presupuesto de 8 mil en Alimentación\n• Dame un análisis completo";

/** Historial acotado: el costo por llamada deja de crecer con la sesión. */
const CAPTURE_TURNS = 6;
const ADVISE_TURNS = 12;

/**
 * sendTx (captura por voz/texto) y sendAnalysis (asesor). El contexto
 * financiero y el system prompt se construyen en el SERVIDOR; el cliente
 * solo manda los mensajes.
 *
 * Cuando el asesor propone una acción, NO se ejecuta: viaja al chat como una
 * tarjeta que la persona confirma. Al confirmar se ejecuta aquí y se le
 * devuelve el resultado al modelo para que cierre la conversación.
 */
export function useAI({
  applyTx,
  applyNewAcc,
  setTxInput,
  setLive,
  categoryNames,
  actionContext,
  onActionDone,
}: {
  applyTx: (tx: ParsedTx) => Promise<{ ok: boolean; error?: string }>;
  applyNewAcc: (d: ParsedNewAcc) => Promise<void>;
  setTxInput: (v: string) => void;
  setLive: (v: string) => void;
  /** Datos vivos para resolver nombres → ids. */
  /** Nombres válidos de categoría, para no guardar una inventada. */
  categoryNames: () => string[];
  actionContext: () => ActionContext;
  /** Tras ejecutar, App recarga lo que cambió. */
  onActionDone: () => Promise<void>;
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
      const { text: raw } = await api.aiCapture(newHist);
      let p: any;
      try {
        p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        p = { action: "ninguna", reply: raw };
      }
      let reply: string = p.reply || "Listo";
      if (p.action === "transaccion" && Number(p.amount) > 0) {
        if (p.category && !categoryNames().includes(p.category)) p.category = "Otros";
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
      let action = reply.action;
      let extra = "";

      // Si la acción no se puede resolver contra los datos reales, se descarta
      // y se le dice al modelo por qué, en vez de mostrar una tarjeta rota.
      if (action) {
        try {
          describeAction(action, actionContext());
        } catch (e: any) {
          extra = `\n\n⚠️ ${e?.message || "No pude preparar esa acción"}`;
          action = undefined;
        }
      }

      setAiHistory([...newHist, { role: "assistant" as const, content: reply.raw ?? reply.text }].slice(-ADVISE_TURNS));
      setAiMsgs((m) => [...m, { role: "assistant", text: (reply.text || "Listo") + extra, action }]);
    } catch (e: any) {
      setAiMsgs((m) => [...m, { role: "assistant", text: e?.message || "Error al conectar." }]);
    } finally {
      setAiLoading(false);
    }
  };

  /** Ejecuta lo confirmado y le devuelve el resultado al modelo. */
  const confirmAction = async (action: ProposedAction) => {
    setAiLoading(true);
    let outcome: string;
    let ok = true;
    try {
      outcome = await runAction(action, actionContext());
      await onActionDone();
    } catch (e: any) {
      ok = false;
      outcome = `No se pudo: ${e?.message || "error"}`;
    }

    setAiMsgs((m) => m.map((x) => (x.action?.toolUseId === action.toolUseId ? { ...x, resolved: ok ? "hecho" : "descartado" } : x)));

    const hist: ChatMsg[] = [
      ...aiHistory,
      { role: "user" as const, content: [{ type: "tool_result", tool_use_id: action.toolUseId, content: outcome, ...(ok ? {} : { is_error: true }) }] },
    ];
    try {
      const reply = await api.aiAdvise(hist.slice(-ADVISE_TURNS));
      setAiHistory([...hist, { role: "assistant" as const, content: reply.raw ?? reply.text }].slice(-ADVISE_TURNS));
      setAiMsgs((m) => [...m, { role: "assistant", text: reply.text || outcome }]);
    } catch {
      // Si el cierre falla, la acción ya ocurrió: se reporta igual.
      setAiMsgs((m) => [...m, { role: "assistant", text: outcome }]);
    } finally {
      setAiLoading(false);
    }
  };

  const dismissAction = (action: ProposedAction) => {
    setAiMsgs((m) => m.map((x) => (x.action?.toolUseId === action.toolUseId ? { ...x, resolved: "descartado" } : x)));
    setAiHistory((h) => [
      ...h,
      { role: "user" as const, content: [{ type: "tool_result", tool_use_id: action.toolUseId, content: "La persona no confirmó esta acción.", is_error: true }] },
    ]);
  };

  return { txLoading, sendTx, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis, confirmAction, dismissAction };
}
