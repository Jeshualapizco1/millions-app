import { useState, type MutableRefObject } from "react";
import { api } from "../lib/api";
import { CATS } from "../lib/constants";
import { fmt } from "../lib/format";
import type { Account, AiMsg, Budget, ChatMsg, Credit, Goal, Transaction, TxType } from "../types";

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

/** sendTx (captura por voz/texto) y sendAnalysis (asesor), cada uno con su historial. */
export function useAI({
  token,
  accsRef,
  txsRef,
  creditsRef,
  budgetsRef,
  goalsRef,
  applyTx,
  applyNewAcc,
  setTxInput,
  setLive,
}: {
  token: string;
  accsRef: MutableRefObject<Account[]>;
  txsRef: MutableRefObject<Transaction[]>;
  creditsRef: MutableRefObject<Credit[]>;
  budgetsRef: MutableRefObject<Budget[]>;
  goalsRef: MutableRefObject<Goal[]>;
  applyTx: (tx: ParsedTx) => Promise<void>;
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
    const cur = accsRef.current;
    const list = cur.map((a) => `${a.name}: ${fmt(a.balance)}`).join(", ");
    const newHist = [...txHistory, { role: "user" as const, content: text }];
    setTxHistory(newHist);
    const sys = `Asistente de registro financiero de Millions. Cuentas: ${list || "ninguna"}. Categorías: ${Object.keys(CATS).join(", ")}.
Responde SOLO con JSON:
Transacción: {"action":"transaccion","type":"gasto|ingreso","amount":NUMBER,"description":"STRING","accountName":"STRING","category":"STRING","reply":"Confirmación"}
Nueva cuenta: {"action":"nueva_cuenta","accountName":"STRING","balance":NUMBER,"icon":"EMOJI","reply":"Confirmación"}
Duda: {"action":"ninguna","reply":"Aclaración"}`;
    try {
      const data = await api.chat({ model: "claude-sonnet-4-20250514", max_tokens: 400, system: sys, messages: newHist }, token);
      const raw = data.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text ?? "";
      let p: any;
      try { p = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { p = { action: "ninguna", reply: raw }; }
      if (p.action === "transaccion" && p.amount > 0) await applyTx(p);
      else if (p.action === "nueva_cuenta" && p.accountName) await applyNewAcc({ accountName: p.accountName, balance: p.balance, icon: p.icon });
      setTxHistory([...newHist, { role: "assistant", content: p.reply }]);
      setLive("✅ " + p.reply);
      setTimeout(() => setLive(""), 3500);
    } catch (e) {
      setLive("❌ Error");
      setTimeout(() => setLive(""), 3000);
    } finally {
      setTxLoading(false);
    }
  };

  const sendAnalysis = async (text: string) => {
    if (!text || aiLoading) return;
    setAiInput("");
    const cur = accsRef.current;
    const curTxs = txsRef.current;
    const curCr = creditsRef.current;
    const curB = budgetsRef.current;
    const curG = goalsRef.current;
    const newHist = [...aiHistory, { role: "user" as const, content: text }];
    setAiMsgs((m) => [...m, { role: "user", text }]);
    setAiLoading(true);
    const totG = curTxs.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0);
    const totI = curTxs.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
    const catMap: Record<string, number> = {};
    curTxs.filter((t) => t.type === "gasto").forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount); });

    // This month spending
    const now = new Date();
    const thisMonthTxs = curTxs.filter((t) => { const d = new Date(t.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
    const thisMonthSpend: Record<string, number> = {};
    thisMonthTxs.filter((t) => t.type === "gasto").forEach((t) => { thisMonthSpend[t.category] = (thisMonthSpend[t.category] || 0) + Number(t.amount); });

    const budgetStatus = curB.map((b) => { const spent = thisMonthSpend[b.category] || 0; const pct = Math.round((spent / b.amount) * 100); return `${b.category}: presupuesto ${fmt(b.amount)}, gastado ${fmt(spent)} (${pct}%)`; }).join("\n");
    const goalStatus = curG.map((g) => { const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0; return `${g.name}: meta ${fmt(g.target_amount)}, ahorrado ${fmt(g.current_amount)} (${pct}%)${g.target_date ? `, fecha objetivo: ${new Date(g.target_date).toLocaleDateString("es-MX")}` : ""}`; }).join("\n");
    const sys = `Eres el asesor financiero de Millions. Responde en español, amigable, claro y accionable. Máximo 3 párrafos, emojis moderados.

DATOS:
Cuentas: ${cur.map((a) => `${a.name}: ${fmt(a.balance)}`).join(", ") || "Sin cuentas"}
Ingresos totales: ${fmt(totI)} | Gastos totales: ${fmt(totG)} | Balance: ${fmt(totI - totG)}
Top gastos: ${Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}: ${fmt(v)}`).join(", ") || "Sin datos"}
Deuda total: ${fmt(curCr.reduce((s, c) => s + Number(c.total_debt || 0), 0))}
Créditos: ${curCr.map((c) => `${c.name}: ${fmt(c.total_debt)}`).join(", ") || "Ninguno"}
Presupuestos este mes:\n${budgetStatus || "Sin presupuestos"}
Metas de ahorro:\n${goalStatus || "Sin metas"}
Últimas txs: ${curTxs.slice(0, 15).map((t) => `${t.type === "gasto" ? "-" : "+"}${fmt(t.amount)} ${t.description}`).join(", ") || "Sin transacciones"}`;
    try {
      const data = await api.chat({ model: "claude-sonnet-4-20250514", max_tokens: 700, system: sys, messages: newHist }, token);
      const reply = data.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text ?? "Error.";
      setAiHistory([...newHist, { role: "assistant", content: reply }]);
      setAiMsgs((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setAiMsgs((m) => [...m, { role: "assistant", text: "Error al conectar." }]);
    } finally {
      setAiLoading(false);
    }
  };

  return { txLoading, sendTx, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis };
}
