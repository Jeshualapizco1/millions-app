import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AiUso } from "../lib/aiUso";
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

/**
 * Lo que la captura extrajo, **todavía sin tocar la base**. Antes se guardaba
 * directo lo que devolvía el modelo y no había dónde corregirlo: así fue como
 * un gasto de mentoría acabó en "Otros" y se descubrió semanas después.
 */
export interface TxDraft extends ParsedTx {
  /** Lo que se dictó o escribió, tal cual, para ver qué se está corrigiendo. */
  dicho: string;
}

export interface ParsedNewAcc {
  accountName: string;
  balance?: number;
  icon?: string;
  currency?: string;
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
  const [draft, setDraft] = useState<TxDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([{ role: "assistant", text: AI_GREETING }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<ChatMsg[]>([]);

  // Consumo del día. Se pide una vez al entrar y después cada respuesta trae
  // el suyo. Es informativo: si no se puede leer, no se dice nada y la app
  // sigue igual — el que decide de verdad es el servidor.
  const [aiUso, setAiUso] = useState<AiUso | null>(null);
  useEffect(() => {
    api.aiUsage().then(setAiUso).catch(() => {});
  }, []);

  const sendTx = async (text: string) => {
    if (!text || txLoading) return;
    setTxInput("");
    setLive("");
    setTxLoading(true);
    const newHist = [...txHistory, { role: "user" as const, content: text }].slice(-CAPTURE_TURNS);
    setTxHistory(newHist);
    try {
      const { text: raw, uso } = await api.aiCapture(newHist);
      if (uso) setAiUso(uso);
      let p: any;
      try {
        p = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        p = { action: "ninguna", reply: raw };
      }
      let reply: string = p.reply || "Listo";
      if (p.action === "transaccion" && Number(p.amount) > 0) {
        if (p.category && !categoryNames().includes(p.category)) p.category = "Otros";
        // El nombre de cuenta se resuelve YA contra las cuentas reales: si el
        // modelo dijo algo que no existe, el borrador sale con la cuenta vacía
        // y la persona la elige, en vez de fallar al guardar y perder lo dicho.
        const cuentas = actionContext().accs;
        const dicha = String(p.accountName ?? "").toLowerCase();
        const match = dicha ? cuentas.find((a) => a.name.toLowerCase().includes(dicha)) : undefined;
        setDraft({
          description: p.description || text,
          amount: Number(p.amount),
          type: p.type === "ingreso" ? "ingreso" : "gasto",
          category: p.category || "Otros",
          accountName: match?.name ?? "",
          dicho: text,
        });
        setDraftError(null);
        // El historial se cierra al confirmar o descartar: si se guardara aquí
        // la confirmación del modelo, diría "registré $850" de algo que la
        // persona todavía puede cambiar o tirar.
        setLive("");
        return;
      }
      if (p.action === "nueva_cuenta" && p.accountName) {
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

  /** Cambia un campo del borrador. Nada de esto toca la base todavía. */
  const updateDraft = (patch: Partial<TxDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDraftError(null);
  };

  /** Aquí, y solo aquí, el movimiento se escribe. Devuelve si quedó guardado. */
  const confirmDraft = async (): Promise<boolean> => {
    if (!draft || txLoading) return false;
    if (!draft.accountName) { setDraftError("Elige una cuenta"); return false; }
    if (!(draft.amount > 0)) { setDraftError("El monto debe ser mayor a cero"); return false; }
    setTxLoading(true);
    try {
      const r = await applyTx(draft);
      // Si falla, el borrador SE QUEDA: perder lo capturado por un error que
      // se puede corregir en pantalla es justo lo que veníamos a evitar.
      if (!r.ok) { setDraftError(r.error || "No se pudo registrar"); return false; }
      const resumen = `Registrado: ${draft.type} de ${draft.amount} en ${draft.category}, cuenta ${draft.accountName}.`;
      setTxHistory((h) => [...h, { role: "assistant" as const, content: resumen }].slice(-CAPTURE_TURNS));
      setDraft(null);
      setDraftError(null);
      setLive("✅ Registrado");
      setTimeout(() => setLive(""), 2500);
      return true;
    } finally {
      setTxLoading(false);
    }
  };

  const discardDraft = () => {
    setDraft(null);
    setDraftError(null);
    setLive("");
    // El modelo se entera de que no se guardó, para que un "no, fueron 200"
    // no se conteste sobre un movimiento que nunca existió.
    setTxHistory((h) => [...h, { role: "assistant" as const, content: "La persona descartó ese movimiento; no se registró." }].slice(-CAPTURE_TURNS));
  };

  const sendAnalysis = async (text: string) => {
    if (!text || aiLoading) return;
    setAiInput("");
    const newHist = [...aiHistory, { role: "user" as const, content: text }].slice(-ADVISE_TURNS);
    setAiMsgs((m) => [...m, { role: "user", text }]);
    setAiLoading(true);
    try {
      const reply = await api.aiAdvise(newHist);
      if (reply.uso) setAiUso(reply.uso);
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
      if (reply.uso) setAiUso(reply.uso);
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

  return { txLoading, sendTx, draft, draftError, updateDraft, confirmDraft, discardDraft, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis, confirmAction, dismissAction, aiUso };
}
