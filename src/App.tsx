import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import CreditForm, { type CreditFormState } from "./components/CreditForm";
import Fab from "./components/Fab";
import Modal from "./components/Modal";
import { useAI, type ParsedNewAcc, type ParsedTx } from "./hooks/useAI";
import { useFinanceData } from "./hooks/useFinanceData";
import { useVoice } from "./hooks/useVoice";
import { api } from "./lib/api";
import { ACC_COLORS, C, CATS } from "./lib/constants";
import { daysUntil, fmt, monthLabel } from "./lib/format";
import AccountModal, { type AccountFormState } from "./modals/AccountModal";
import BudgetModal from "./modals/BudgetModal";
import GoalModal, { AddToGoalModal, type GoalFormState } from "./modals/GoalModal";
import ManualTxModal, { type ManualTxFormState } from "./modals/ManualTxModal";
import type { Account, Credit, Goal } from "./types";
import Analisis from "./views/Analisis";
import Creditos from "./views/Creditos";
import Cuentas from "./views/Cuentas";
import Dashboard, { type Comparison } from "./views/Dashboard";
import Historial from "./views/Historial";
import Metas, { type BudgetWithProgress } from "./views/Metas";

type Tab = "dash" | "metas" | "creditos" | "analisis" | "hist" | "accs";

type CreditUpsert = Omit<Credit, "id" | "created_at">;
type GoalUpsert = Omit<Goal, "id" | "created_at" | "account_id" | "completed_at">;

/** Cuenta en edición: el input deja el balance como string mientras se teclea. */
type EditAccState = Omit<Account, "balance"> & { balance: string | number };

const emptyGoalForm: GoalFormState = { name: "", target_amount: "", current_amount: "", target_date: "", icon: "🎯", color: "#7c6af7", notes: "" };

export default function App({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const userName = session.user?.user_metadata?.name || session.user?.email?.split("@")[0] || "Usuario";

  const { accs, setAccs, txs, setTxs, credits, setCredits, budgets, setBudgets, goals, setGoals, booting, loadError, accsRef, txsRef } = useFinanceData();
  const [tab, setTab] = useState<Tab>("dash");

  // FAB
  const [fab, setFab] = useState(false);
  const [live, setLive] = useState("");
  const [txInput, setTxInput] = useState("");

  // Modals
  const [mMan, setMMan] = useState(false);
  const [man, setMan] = useState<ManualTxFormState>({ desc: "", amt: "", type: "gasto", aid: "", cat: "Otros" });
  const [editAcc, setEditAcc] = useState<EditAccState | null>(null);
  const [mNewAcc, setMNewAcc] = useState(false);
  const [newAcc, setNewAcc] = useState<AccountFormState>({ name: "", balance: "", icon: "🏦" });
  const [mCredit, setMCredit] = useState(false);
  const [editCredit, setEditCredit] = useState<CreditFormState | null>(null);
  const [mBudget, setMBudget] = useState(false);
  const [budgetCat, setBudgetCat] = useState("Alimentación");
  const [budgetAmt, setBudgetAmt] = useState("");
  const [mGoal, setMGoal] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalFormState | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);
  const [mAddToGoal, setMAddToGoal] = useState<Goal | null>(null);
  const [addGoalAmt, setAddGoalAmt] = useState("");

  // ── Transactions (una RPC atómica por operación; sin ids temporales) ───────
  const applyTx = async (tx: ParsedTx): Promise<{ ok: boolean; error?: string }> => {
    const cur = accsRef.current;
    const acc = cur.find((a) => tx.accountName && a.name.toLowerCase().includes(tx.accountName.toLowerCase()));
    if (!acc) return { ok: false, error: `No encontré la cuenta "${tx.accountName ?? ""}". Cuentas: ${cur.map((a) => a.name).join(", ")}` };
    try {
      const saved = await api.applyTx(
        { accountId: acc.id, kind: tx.type, amount: tx.amount, description: tx.description, category: tx.category || "Otros" },
        cur
      );
      setTxs((p) => [saved, ...p]);
      setAccs((p) => p.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + (tx.type === "gasto" ? -tx.amount : tx.amount) } : a)));
      return { ok: true };
    } catch (e: any) {
      console.error(e);
      return { ok: false, error: e?.message || "No se pudo registrar" };
    }
  };

  const deleteTx = async (id: string) => {
    const tx = txsRef.current.find((t) => t.id === id);
    if (!tx) return;
    try {
      await api.deleteTx(id); // reverse_transaction: revierte saldo y efectos en la misma transacción
      setTxs((p) => p.filter((t) => t.id !== id));
      const delta = tx.type === "gasto" ? tx.amount : -tx.amount;
      setAccs((p) => p.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + delta } : a)));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Accounts ───────────────────────────────────────────────────────────────
  const applyNewAcc = async (d: ParsedNewAcc) => {
    const cur = accsRef.current;
    const color = ACC_COLORS[cur.length % ACC_COLORS.length];
    try {
      const s = await api.addAccount({ name: d.accountName, balance: d.balance ?? 0, color, icon: d.icon ?? "🏦" });
      setAccs((p) => [...p, s]);
    } catch (e) {
      console.error(e);
    }
  };
  const saveNewAcc = async () => {
    if (!newAcc.name.trim()) return;
    await applyNewAcc({ accountName: newAcc.name.trim(), balance: parseFloat(String(newAcc.balance) || "0"), icon: newAcc.icon });
    setNewAcc({ name: "", balance: "", icon: "🏦" });
    setMNewAcc(false);
  };
  const saveEditAcc = async () => {
    if (!editAcc || !editAcc.name.trim()) return;
    setAccs((p) => p.map((a) => (a.id === editAcc.id ? { ...a, ...editAcc, balance: Number(editAcc.balance) } : a)));
    try {
      await api.updateAccount({ id: editAcc.id, name: editAcc.name, balance: parseFloat(String(editAcc.balance)), icon: editAcc.icon, color: editAcc.color });
    } catch (e) {
      console.error(e);
    }
    setEditAcc(null);
  };

  // ── Credits ────────────────────────────────────────────────────────────────
  const parseCredit = (f: CreditFormState): CreditUpsert => ({
    name: f.name,
    type: f.type,
    institution: f.institution || null,
    total_debt: parseFloat(String(f.total_debt || 0)),
    credit_limit: parseFloat(String(f.credit_limit || 0)) || null,
    monthly_payment: parseFloat(String(f.monthly_payment || 0)) || null,
    cut_day: parseInt(String(f.cut_day)) || null,
    payment_day: parseInt(String(f.payment_day)) || null,
    next_payment_date: f.next_payment_date || null,
    interest_rate: parseFloat(String(f.interest_rate)) || null,
    notes: f.notes || null,
  });
  const saveNewCredit = async (f: CreditFormState) => {
    if (!f.name.trim()) return;
    setMCredit(false);
    try {
      const s = await api.addCredit(parseCredit(f));
      setCredits((pr) => [...pr, s]);
    } catch (e) {
      console.error(e);
    }
  };
  const saveEditCredit = async (f: CreditFormState) => {
    if (!f.name.trim()) return;
    const p = { id: f.id!, ...parseCredit(f) };
    setCredits((pr) => pr.map((c) => (c.id === f.id ? { ...c, ...p } : c)));
    setEditCredit(null);
    try {
      await api.updateCredit(p);
    } catch (e) {
      console.error(e);
    }
  };
  const deleteCredit = async (id: string) => {
    setCredits((p) => p.filter((c) => c.id !== id));
    setEditCredit(null);
    try {
      await api.deleteCredit(id);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Budgets ────────────────────────────────────────────────────────────────
  const saveBudget = async () => {
    const amount = parseFloat(budgetAmt);
    if (!amount || amount <= 0) return;
    try {
      const saved = await api.upsertBudget({ category: budgetCat, amount });
      setBudgets((p) => {
        const exists = p.some((b) => b.id === saved.id);
        return exists ? p.map((b) => (b.id === saved.id ? saved : b)) : [...p, saved];
      });
    } catch (e) {
      console.error(e);
    }
    setBudgetAmt("");
    setMBudget(false);
  };
  const deleteBudget = async (id: string) => {
    setBudgets((p) => p.filter((b) => b.id !== id));
    try {
      await api.deleteBudget(id);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Goals ──────────────────────────────────────────────────────────────────
  const saveNewGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) return;
    const p: GoalUpsert = { name: goalForm.name, target_amount: parseFloat(String(goalForm.target_amount)), current_amount: parseFloat(String(goalForm.current_amount || 0)), target_date: goalForm.target_date || null, icon: goalForm.icon, color: goalForm.color, notes: goalForm.notes || null };
    setMGoal(false);
    try {
      const s = await api.addGoal(p);
      setGoals((pr) => [...pr, s]);
    } catch (e) {
      console.error(e);
    }
  };
  const saveEditGoal = async () => {
    if (!editGoal) return;
    const p = { id: editGoal.id!, name: editGoal.name, target_amount: parseFloat(String(editGoal.target_amount)), current_amount: parseFloat(String(editGoal.current_amount || 0)), target_date: editGoal.target_date || null, icon: editGoal.icon, color: editGoal.color, notes: editGoal.notes || null };
    setGoals((pr) => pr.map((g) => (g.id === editGoal.id ? { ...g, ...p } : g)));
    setEditGoal(null);
    try {
      await api.updateGoal(p);
    } catch (e) {
      console.error(e);
    }
  };
  const deleteGoal = async (id: string) => {
    setGoals((p) => p.filter((g) => g.id !== id));
    setEditGoal(null);
    try {
      await api.deleteGoal(id);
    } catch (e) {
      console.error(e);
    }
  };
  const addToGoal = async () => {
    if (!mAddToGoal || !addGoalAmt) return;
    const amount = parseFloat(addGoalAmt);
    if (!amount || amount <= 0) return;
    setMAddToGoal(null);
    setAddGoalAmt("");
    try {
      const updated = await api.contributeGoal({ goalId: mAddToGoal.id, amount });
      setGoals((p) => p.map((g) => (g.id === updated.id ? updated : g)));
    } catch (e) {
      console.error(e);
    }
  };

  // ── AI + voz ───────────────────────────────────────────────────────────────
  const { txLoading, sendTx, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis } = useAI({ applyTx, applyNewAcc, setTxInput, setLive });

  const { mic, voiceOK, startMic, stopMic } = useVoice({
    onResult: (t) => { setLive(t); setTxInput(t); },
    onFinal: (final) => { setFab(false); setTimeout(() => sendTx(final.trim()), 200); },
    onStop: () => setLive(""),
  });
  useEffect(() => { if (!fab) stopMic(); }, [fab, stopMic]);

  const saveTxManual = async () => {
    const { desc, amt, type, aid, cat } = man;
    if (!desc || !amt || !aid) return;
    const amount = parseFloat(amt);
    if (!amount || amount <= 0) return;
    await applyTx({ description: desc, amount, type, category: cat, accountName: accs.find((a) => a.id === aid)?.name ?? "" });
    setMan({ desc: "", amt: "", type: "gasto", aid: "", cat: "Otros" });
    setMMan(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const totBal = accs.reduce((s, a) => s + Number(a.balance), 0);
  const totG = txs.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0);
  const totI = txs.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
  const totalDebt = credits.reduce((s, c) => s + Number(c.total_debt || 0), 0);

  const urgentCredits = useMemo(() => credits.filter((c) => {
    const d1 = daysUntil(c.payment_day);
    const d2 = c.next_payment_date ? Math.ceil((new Date(c.next_payment_date).getTime() - Date.now()) / 864e5) : null;
    return (d1 !== null && d1 <= 5) || (d2 !== null && d2 <= 5);
  }), [credits]);

  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    txs.filter((t) => t.type === "gasto").forEach((t) => { const c = t.category || "Otros"; map[c] = (map[c] || 0) + Number(t.amount); });
    return Object.entries(map).map(([label, value]) => ({ label, value, color: CATS[label]?.color || "#6b7280", icon: CATS[label]?.icon || "📦" })).sort((a, b) => b.value - a.value);
  }, [txs]);

  // 6-month data
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mt = txs.filter((t) => { const td = new Date(t.date); return td.getFullYear() === y && td.getMonth() === m; });
      months.push({ label: monthLabel(d), ingresos: mt.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0), gastos: mt.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0) });
    }
    return months;
  }, [txs]);

  // Month comparison
  const comparison = useMemo<Comparison>(() => {
    const now = new Date();
    const thisM = txs.filter((t) => { const d = new Date(t.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
    const lastD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastM = txs.filter((t) => { const d = new Date(t.date); return d.getFullYear() === lastD.getFullYear() && d.getMonth() === lastD.getMonth(); });
    const tG = thisM.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0);
    const lG = lastM.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0);
    const tI = thisM.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
    const lI = lastM.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
    const diff = lG > 0 ? Math.round(((tG - lG) / lG) * 100) : null;
    return { thisGastos: tG, lastGastos: lG, thisIngresos: tI, lastIngresos: lI, diffPct: diff };
  }, [txs]);

  // Budget progress (this month)
  const budgetProgress = useMemo<BudgetWithProgress[]>(() => {
    const now = new Date();
    const thisMonthGastos: Record<string, number> = {};
    txs.filter((t) => { const d = new Date(t.date); return t.type === "gasto" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).forEach((t) => { thisMonthGastos[t.category] = (thisMonthGastos[t.category] || 0) + Number(t.amount); });
    return budgets.map((b) => ({ ...b, spent: thisMonthGastos[b.category] || 0, pct: b.amount > 0 ? Math.round(((thisMonthGastos[b.category] || 0) / b.amount) * 100) : 0 }));
  }, [budgets, txs]);

  if (booting) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, gap: 16 }}>
      <div style={{ fontSize: 52 }}>💰</div>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: C.muted, fontSize: 13 }}>Cargando tus finanzas…</div>
    </div>
  );

  if (loadError) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, gap: 16, padding: 24 }}>
      <div style={{ fontSize: 52 }}>⚠️</div>
      <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>No se pudieron cargar tus datos</div>
      <div style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>{loadError}</div>
      <button onClick={() => window.location.reload()} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Reintentar</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}22`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.aLight, letterSpacing: -0.5 }}>Millions</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{userName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: `linear-gradient(135deg,${C.accent},#9333ea)`, color: "#fff", borderRadius: 12, padding: "6px 14px", fontSize: 13, fontWeight: 800, boxShadow: "0 4px 12px #7c6af733" }}>{fmt(totBal)}</div>
          <button onClick={onSignOut} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 12, padding: "6px 10px", cursor: "pointer" }}>↩</button>
        </div>
      </div>

      {/* Alert banner */}
      {urgentCredits.length > 0 && (
        <div style={{ background: C.red + "18", borderBottom: `1px solid ${C.red}33`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setTab("creditos")}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>{urgentCredits.length === 1 ? `Pago próximo: ${urgentCredits[0].name}` : `${urgentCredits.length} pagos próximos`} — Toca para ver</span>
        </div>
      )}

      {/* Budget alert */}
      {budgetProgress.some((b) => b.pct >= 90) && (
        <div style={{ background: C.amber + "18", borderBottom: `1px solid ${C.amber}33`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setTab("metas")}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>Presupuesto al límite: {budgetProgress.filter((b) => b.pct >= 90).map((b) => b.category).join(", ")} — Toca para ver</span>
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", background: C.surface, borderBottom: `1px solid ${C.border}22`, overflowX: "auto" }}>
        {([["dash", "📊", "Inicio"], ["metas", "🎯", "Metas"], ["creditos", "💳", "Créditos"], ["analisis", "🤖", "Análisis"], ["hist", "📋", "Historial"], ["accs", "🏦", "Cuentas"]] as [Tab, string, string][]).map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: "0 0 16.66%", minWidth: 56, padding: "11px 4px 8px", background: "none", border: "none", cursor: "pointer", borderBottom: tab === k ? `2px solid ${C.accent}` : "2px solid transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 17 }}>{icon}</span>
            <span style={{ fontSize: 9, color: tab === k ? C.aLight : C.muted, fontWeight: tab === k ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 100px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        {tab === "dash" && <Dashboard accs={accs} txs={txs} totBal={totBal} totI={totI} totG={totG} totalDebt={totalDebt} comparison={comparison} monthlyData={monthlyData} catData={catData} onEditAcc={(a) => setEditAcc({ ...a })} onNewAcc={() => setMNewAcc(true)} onGoHist={() => setTab("hist")} />}
        {tab === "metas" && <Metas budgetProgress={budgetProgress} goals={goals} onAddBudget={() => setMBudget(true)} onDeleteBudget={deleteBudget} onNewGoal={() => { setGoalForm(emptyGoalForm); setMGoal(true); }} onEditGoal={(g) => setEditGoal({ ...g })} onAddToGoal={setMAddToGoal} />}
        {tab === "creditos" && <Creditos credits={credits} totalDebt={totalDebt} onEdit={(c) => setEditCredit({ ...c })} onAdd={() => setMCredit(true)} />}
        {tab === "analisis" && <Analisis aiMsgs={aiMsgs} aiLoading={aiLoading} aiInput={aiInput} setAiInput={setAiInput} onSend={sendAnalysis} />}
        {tab === "hist" && <Historial txs={txs} onDelete={deleteTx} />}
        {tab === "accs" && <Cuentas accs={accs} txs={txs} onEdit={(a) => setEditAcc({ ...a })} onNew={() => setMNewAcc(true)} />}
      </div>

      {/* FAB + sheet */}
      <Fab fab={fab} onOpen={() => setFab(true)} onClose={() => setFab(false)} mic={mic} live={live} txLoading={txLoading} txInput={txInput} setTxInput={setTxInput} voiceOK={voiceOK} startMic={startMic} stopMic={stopMic} onSend={sendTx} onManual={() => { setFab(false); setMMan(true); }} />

      {/* Modal: Nueva cuenta */}
      {mNewAcc && <AccountModal mode="new" form={newAcc} update={(p) => setNewAcc((f) => ({ ...f, ...p }))} onSave={saveNewAcc} onClose={() => setMNewAcc(false)} />}

      {/* Modal: Editar cuenta */}
      {editAcc && <AccountModal mode="edit" form={editAcc} update={(p) => setEditAcc((a) => (a ? { ...a, ...p } : a))} onSave={saveEditAcc} onClose={() => setEditAcc(null)} />}

      {/* Modal: Créditos */}
      {mCredit && <Modal onClose={() => setMCredit(false)}><CreditForm onSave={saveNewCredit} onClose={() => setMCredit(false)} /></Modal>}
      {editCredit && <Modal onClose={() => setEditCredit(null)}><CreditForm initial={editCredit} onSave={saveEditCredit} onDelete={deleteCredit} onClose={() => setEditCredit(null)} /></Modal>}

      {/* Modal: Nuevo presupuesto */}
      {mBudget && <BudgetModal budgetCat={budgetCat} budgetAmt={budgetAmt} onCat={setBudgetCat} onAmt={setBudgetAmt} onSave={saveBudget} onClose={() => setMBudget(false)} />}

      {/* Modal: Nueva meta */}
      {mGoal && <GoalModal mode="new" form={goalForm} update={(p) => setGoalForm((f) => ({ ...f, ...p }))} onSave={saveNewGoal} onClose={() => setMGoal(false)} />}

      {/* Modal: Editar meta */}
      {editGoal && <GoalModal mode="edit" form={editGoal} update={(p) => setEditGoal((f) => (f ? { ...f, ...p } : f))} onSave={saveEditGoal} onDelete={deleteGoal} onClose={() => setEditGoal(null)} />}

      {/* Modal: Abonar a meta */}
      {mAddToGoal && <AddToGoalModal goal={mAddToGoal} amount={addGoalAmt} onAmount={setAddGoalAmt} onSave={addToGoal} onClose={() => { setMAddToGoal(null); setAddGoalAmt(""); }} />}

      {/* Modal: Entrada manual */}
      {mMan && <ManualTxModal form={man} update={(p) => setMan((f) => ({ ...f, ...p }))} accs={accs} onSave={saveTxManual} onClose={() => setMMan(false)} />}
    </div>
  );
}
