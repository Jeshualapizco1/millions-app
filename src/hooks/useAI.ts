import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { AiUso } from "../lib/aiUso";
import { describeAction, runAction, type ActionContext } from "../lib/actions";
import { captureDateISO, toLocalDateISO } from "../lib/dates";
import { namesCreditPurchase } from "../lib/captureSource";
import { findByName } from "../lib/names";
import type { AiMsg, ChatMsg, ProposedAction, TxType } from "../types";

/** Lo que la IA extrae del lenguaje natural para registrar una transacción. */
export interface ParsedTx {
  description: string;
  date?: string;
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

/**
 * Una cuenta dictada, todavía sin crear. El saldo va como texto porque es un
 * campo editable: convertirlo a número en cada tecla impide escribir "1.".
 */
export interface AccDraft {
  accountName: string;
  balance: string;
  icon: string;
  dicho: string;
}

const AI_GREETING = "¿Qué quieres entender de tu dinero? Puedo ayudarte con tus movimientos, presupuestos, cuentas y créditos. Si proponemos un cambio, tú lo confirmas antes de guardarlo.";

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
  onActionDoneError,
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
  /** Si la recarga falla, la acción YA ocurrió: se avisa, no se reporta como fallida. */
  onActionDoneError: (e: unknown) => void;
}) {
  // Acciones en vuelo, por id. Es un ref y no estado porque el segundo toque
  // llega antes de que React vuelva a pintar con aiLoading en true.
  const acting = useRef(new Set<string>());
  const captureEpoch = useRef(0);
  const captureBusy = useRef(false);
  const confirming = useRef(false);
  const adviseBusy = useRef(false);
  const alive = useRef(true);
  const liveTimer = useRef<ReturnType<typeof setTimeout>>();
  const transient = (text: string, ms: number) => {
    clearTimeout(liveTimer.current);
    setLive(text);
    liveTimer.current = setTimeout(() => { if (alive.current) setLive(""); }, ms);
  };
  useEffect(() => { alive.current = true; return () => { alive.current = false; captureEpoch.current++; clearTimeout(liveTimer.current); }; }, []);
  const [txLoading, setTxLoading] = useState(false);
  const [txHistory, setTxHistory] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState<TxDraft | null>(null);
  const [accDraft, setAccDraft] = useState<AccDraft | null>(null);
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
    api.aiUsage().then((usage) => { if (alive.current) setAiUso(usage); }).catch(() => {});
  }, []);

  const cancelCapture = useCallback(() => {
    if (confirming.current) return;
    captureEpoch.current++;
    captureBusy.current = false;
    clearTimeout(liveTimer.current);
    setTxLoading(false);
  }, []);
  const sendTx = async (text: string) => {
    if (!text.trim() || captureBusy.current || confirming.current || draft || accDraft) return;
    captureBusy.current = true;
    const epoch = ++captureEpoch.current;
    clearTimeout(liveTimer.current);
    setTxInput(text);
    setLive("");
    setTxLoading(true);
    const newHist = [...txHistory, { role: "user" as const, content: text }].slice(-CAPTURE_TURNS);
    setTxHistory(newHist);
    try {
      const { text: raw, uso } = await api.aiCapture(newHist);
      if (!alive.current || epoch !== captureEpoch.current) return;
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
        //
        // Con `findByName` y no con `includes`: exacta primero, parcial solo si
        // no hay ambigüedad. Con "BBVA" y "BBVA Oro", el `includes` prellenaba
        // la primera que encontrara y la persona confirmaba sin mirar.
        const context = actionContext();
        if (namesCreditPurchase(text, p.type === "ingreso" ? "ingreso" : "gasto", String(p.accountName ?? ""), context.credits || [])) {
          transient("Las compras con tarjeta de crédito aún no se pueden registrar aquí. No guardé este movimiento. En Créditos puedes registrar tu deuda y sus pagos.", 12000);
          return;
        }
        const cuentas = context.accs;
        let match;
        try {
          match = findByName(cuentas, String(p.accountName ?? ""), "la cuenta");
        } catch {
          match = undefined; // no existe o es ambigua: que la elija la persona
        }
        setTxInput("");
        setDraft({
          description: p.description || text,
          amount: Number(p.amount),
          type: p.type === "ingreso" ? "ingreso" : "gasto",
          category: p.category || "Otros",
          accountName: match?.name ?? "",
          dicho: text,
          date: toLocalDateISO(),
        });
        setDraftError(null);
        // El historial se cierra al confirmar o descartar: si se guardara aquí
        // la confirmación del modelo, diría "registré $850" de algo que la
        // persona todavía puede cambiar o tirar.
        setLive("");
        return;
      }
      if (p.action === "nueva_cuenta" && p.accountName) {
        // Igual que un movimiento: se propone y la persona confirma. El saldo
        // inicial entra al patrimonio neto, y ahí un número mal entendido no
        // se nota hasta mucho después.
        setTxInput("");
        setAccDraft({ accountName: String(p.accountName), balance: String(p.balance ?? 0), icon: String(p.icon ?? "🏦"), dicho: text });
        setDraftError(null);
        setLive("");
        return;
      }
      setTxHistory([...newHist, { role: "assistant" as const, content: reply }].slice(-CAPTURE_TURNS));
      transient(reply, 6000);
    } catch (e: any) {
      if (alive.current && epoch === captureEpoch.current) transient(e?.message || "No se pudo interpretar. Puedes reintentar o usar Manual.", 10000);
    } finally {
      if (alive.current && epoch === captureEpoch.current) { captureBusy.current = false; setTxLoading(false); }
    }
  };

  /** Cambia un campo del borrador. Nada de esto toca la base todavía. */
  const updateDraft = (patch: Partial<TxDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDraftError(null);
  };

  /** Aquí, y solo aquí, el movimiento se escribe. Devuelve si quedó guardado. */
  const confirmDraft = async (): Promise<boolean> => {
    if (!draft || captureBusy.current || confirming.current) return false;
    if (!draft.accountName) { setDraftError("Elige una cuenta"); return false; }
    if (!Number.isFinite(draft.amount) || !(draft.amount > 0)) { setDraftError("El monto debe ser mayor a cero"); return false; }
    if (!draft.description.trim()) { setDraftError("Escribe una descripción"); return false; }
    try { captureDateISO(draft.date || toLocalDateISO()); } catch(e) { setDraftError((e as Error).message); return false; }
    confirming.current = true;
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
      transient("Movimiento guardado", 3500);
      return true;
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "No se pudo guardar. Revisa e intenta de nuevo.");
      return false;
    } finally {
      confirming.current = false;
      setTxLoading(false);
    }
  };

  const updateAccDraft = (patch: Partial<AccDraft>) => {
    setAccDraft((d) => (d ? { ...d, ...patch } : d));
    setDraftError(null);
  };

  /** Aquí, y solo aquí, la cuenta se crea. Devuelve si quedó guardada. */
  const confirmAccDraft = async (): Promise<boolean> => {
    if (!accDraft || captureBusy.current || confirming.current) return false;
    const nombre = accDraft.accountName.trim();
    if (!nombre) { setDraftError("Ponle un nombre a la cuenta"); return false; }
    const saldo = Number(accDraft.balance);
    if (!Number.isFinite(saldo)) { setDraftError("El saldo tiene que ser un número"); return false; }
    confirming.current = true;
    setTxLoading(true);
    try {
      await applyNewAcc({ accountName: nombre, balance: saldo, icon: accDraft.icon });
      setTxHistory((h) => [...h, { role: "assistant" as const, content: `Cuenta creada: ${nombre} con ${saldo}.` }].slice(-CAPTURE_TURNS));
      setAccDraft(null);
      setDraftError(null);
      transient("Cuenta creada", 3500);
      return true;
    } catch (e: any) {
      setDraftError(e?.message || "No se pudo crear la cuenta");
      return false;
    } finally {
      confirming.current = false;
      setTxLoading(false);
    }
  };

  const discardAccDraft = () => {
    setAccDraft(null);
    setDraftError(null);
    setLive("");
    setTxHistory((h) => [...h, { role: "assistant" as const, content: "La persona descartó esa cuenta; no se creó." }].slice(-CAPTURE_TURNS));
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
    if (!text.trim() || adviseBusy.current || acting.current.size > 0) return;
    adviseBusy.current = true;
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
      adviseBusy.current = false;
      setAiLoading(false);
    }
  };

  /** Ejecuta lo confirmado y le devuelve el resultado al modelo. */
  const confirmAction = async (action: ProposedAction) => {
    // Un doble toque en "Confirmar" movía el dinero dos veces: ningún await
    // había devuelto el control cuando llegaba el segundo click.
    if (acting.current.has(action.toolUseId)) return;
    acting.current.add(action.toolUseId);
    setAiMsgs((m) => m.map((x) => (x.action?.toolUseId === action.toolUseId && !x.resolved ? { ...x, resolved: "en_curso" } : x)));
    setAiLoading(true);
    let outcome: string;
    let ok = true;
    try {
      outcome = await runAction(action, actionContext());
    } catch (e: any) {
      ok = false;
      outcome = `No se pudo: ${e?.message || "error"}`;
    }
    // La recarga va aparte: si falla, la transferencia YA se hizo. Meterla en
    // el mismo try hacía que el modelo recibiera is_error, dijera "no se
    // pudo" y la persona la repitiera.
    if (ok) {
      try {
        await onActionDone();
      } catch (e) {
        onActionDoneError(e);
      }
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
      acting.current.delete(action.toolUseId);
      setAiLoading(false);
    }
  };

  const dismissAction = (action: ProposedAction) => {
    if (acting.current.has(action.toolUseId)) return;
    setAiMsgs((m) => m.map((x) => (x.action?.toolUseId === action.toolUseId ? { ...x, resolved: "descartado" } : x)));
    setAiHistory((h) => [
      ...h,
      { role: "user" as const, content: [{ type: "tool_result", tool_use_id: action.toolUseId, content: "La persona no confirmó esta acción.", is_error: true }] },
    ]);
  };

  return { cancelCapture, txLoading, sendTx, draft, accDraft, draftError, updateDraft, confirmDraft, discardDraft, updateAccDraft, confirmAccDraft, discardAccDraft, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis, confirmAction, dismissAction, aiUso };
}
