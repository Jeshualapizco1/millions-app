import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import CreditForm, { type CreditFormState } from "./components/CreditForm";
import Fab from "./components/Fab";
import Modal from "./components/Modal";
import ConfirmModal from "./components/ConfirmModal";
import { CategoriesProvider } from "./lib/categories";
import CategoriesModal from "./modals/CategoriesModal";
import { Toasts, useToasts } from "./components/Toast";
import { useAI, type ParsedNewAcc, type ParsedTx } from "./hooks/useAI";
import { useFinanceData } from "./hooks/useFinanceData";
import { useVoice } from "./hooks/useVoice";
import { api } from "./lib/api";
import { ACC_COLORS, C } from "./lib/constants";
import { daysUntil, fmt, monthLabel } from "./lib/format";
import { daysUntilDate, diasRestantesDeGracia, diasRestantesDePlazo, nextMonthlyDate } from "./lib/dates";
import { filterByPeriod, PERIODS, sumIncome, sumSpend, type PeriodKey } from "./lib/periods";
import { netWorthHistory, projectMonth } from "./lib/analytics";
import { budgetProgress as calcBudgets, totalBudgetStatus } from "./lib/budgets";
import { logError } from "./lib/errorLog";
import { findByName } from "./lib/names";
import { GRACIA_DIAS, LEGAL_VERSION, PRUEBA_DIAS } from "./lib/legal";
import Perfil from "./views/Perfil";
import LegalGate from "./views/LegalGate";
import Arranque, { type ArranqueResult } from "./views/Arranque";
import FinDePrueba from "./views/FinDePrueba";
import { hasForeign, toBase } from "./lib/currency";
import { budgetAlertKey, creditAlertKey, dismissAlert, isDismissed } from "./lib/alerts";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { esFalloDeRed } from "./lib/offlineQueue";
import AccountModal, { type AccountFormState } from "./modals/AccountModal";
import BudgetModal from "./modals/BudgetModal";
import GoalModal, { AddToGoalModal, type GoalFormState } from "./modals/GoalModal";
import ManualTxModal, { type ManualTxFormState } from "./modals/ManualTxModal";
import EditTxModal from "./modals/EditTxModal";
import PayCreditModal from "./modals/PayCreditModal";
import RecurringModal from "./modals/RecurringModal";
import TransferModal from "./modals/TransferModal";
import TotalBudgetModal from "./modals/TotalBudgetModal";
import ImportCsvModal from "./modals/ImportCsvModal";
import PasswordModal from "./modals/PasswordModal";
import type { Account, Credit, Goal, RecurringRule, Transaction, TxType } from "./types";
import Analisis from "./views/Analisis";
import Creditos from "./views/Creditos";
import Cuentas from "./views/Cuentas";
import Dashboard, { type Comparison } from "./views/Dashboard";
import Historial from "./views/Historial";
import Metas, { type BudgetWithProgress } from "./views/Metas";

type Tab = "dash" | "metas" | "creditos" | "analisis" | "hist" | "accs" | "perfil";

type CreditUpsert = Omit<Credit, "id" | "created_at">;
type GoalUpsert = Omit<Goal, "id" | "created_at" | "account_id" | "completed_at">;

/** Cuenta en edición: el input deja el balance como string mientras se teclea. */
type EditAccState = Omit<Account, "balance"> & { balance: string | number };

const emptyGoalForm: GoalFormState = { name: "", target_amount: "", current_amount: "", target_date: "", icon: "🎯", color: "#7c6af7", notes: "" };

export default function App({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const userName = session.user?.user_metadata?.name || session.user?.email?.split("@")[0] || "Usuario";

  const { accs, setAccs, txs, setTxs, credits, setCredits, budgets, setBudgets, goals, setGoals, recurring, setRecurring, upcoming, setUpcoming, categories, setCategories, profile, setProfile, fx, booting, loadError, accsRef, txsRef, creditsRef, goalsRef } = useFinanceData();
  const [tab, setTab] = useState<Tab>("dash");
  const { toasts, push, dismiss } = useToasts();

  // FAB
  const [fab, setFab] = useState(false);
  const [live, setLive] = useState("");
  const [txInput, setTxInput] = useState("");

  // Modals
  const [mMan, setMMan] = useState(false);
  const [man, setMan] = useState<ManualTxFormState>({ desc: "", amt: "", type: "gasto", aid: "", cat: "Otros" });
  const [editAcc, setEditAcc] = useState<EditAccState | null>(null);
  const [mNewAcc, setMNewAcc] = useState(false);
  const [newAcc, setNewAcc] = useState<AccountFormState>({ name: "", balance: "", icon: "🏦", currency: "MXN" });
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
  const [mPass, setMPass] = useState(false);
  const [mTransfer, setMTransfer] = useState(false);
  const [payCredit, setPayCredit] = useState<Credit | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [addGoalAcc, setAddGoalAcc] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [mRecurring, setMRecurring] = useState(false);
  const [editRecurring, setEditRecurring] = useState<RecurringRule | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel?: string; action: () => void } | null>(null);
  const [mCats, setMCats] = useState(false);
  const [mTotalBudget, setMTotalBudget] = useState(false);
  const [budgetRollover, setBudgetRollover] = useState(false);
  const [mImport, setMImport] = useState(false);
  const [alertTick, setAlertTick] = useState(0);

  const oops = (e: unknown, fallback: string) => {
    console.error(e);
    logError(e, { action: fallback, tab });
    push({ kind: "error", text: (e as Error)?.message || fallback });
  };

  // ── Legal y baja de cuenta ────────────────────────────────────────────────
  const aceptarLegal = async () => {
    const at = await api.acceptLegal(LEGAL_VERSION);
    // Se refleja en memoria en vez de recargar: el portón desaparece solo.
    setProfile((p) => (p ? { ...p, legal_accepted_at: at, legal_version: LEGAL_VERSION } : p));
  };

  const pedirBorrado = () =>
    setConfirm({
      title: "¿Borrar tu cuenta?",
      message:
        `Se eliminarán de forma permanente tus ${txs.length} movimientos, tus cuentas, créditos, presupuestos y metas. ` +
        `Tienes ${GRACIA_DIAS} días para arrepentirte; después no habrá manera de recuperarlos. ` +
        "Si aún no exportas tus datos, cancela y hazlo primero.",
      confirmLabel: "Sí, borrar",
      action: async () => {
        try {
          const at = await api.requestAccountDeletion();
          setProfile((p) => (p ? { ...p, deletion_requested_at: at } : p));
          push({ kind: "ok", text: `Cuenta programada para borrarse en ${GRACIA_DIAS} días` });
        } catch (e) {
          oops(e, "No se pudo programar el borrado");
        }
      },
    });

  const cancelarBorrado = async () => {
    try {
      await api.cancelAccountDeletion();
      setProfile((p) => (p ? { ...p, deletion_requested_at: null } : p));
      push({ kind: "ok", text: "Tu cuenta ya no se borrará" });
    } catch (e) {
      oops(e, "No se pudo cancelar el borrado");
    }
  };

  const diasParaBorrado = diasRestantesDeGracia(profile?.deletion_requested_at, GRACIA_DIAS);

  // Días que quedan de prueba. 0 = se acabó. Se avisa la última semana: un
  // contador encendido los 30 días es ruido, y a 7 días todavía da tiempo.
  const diasDePrueba = diasRestantesDePlazo(profile?.created_at, PRUEBA_DIAS);
  const avisarPrueba = diasDePrueba !== null && diasDePrueba > 0 && diasDePrueba <= 7;

  // ── Arranque guiado ───────────────────────────────────────────────────────
  const cerrarArranque = async () => {
    const at = await api.completeOnboarding();
    setProfile((p) => (p ? { ...p, onboarded_at: at } : p));
  };

  /**
   * Todo lo del arranque se escribe aquí, de un tirón. Las cuentas primero
   * porque el ingreso fijo necesita un id real, no un nombre.
   *
   * Salta las cuentas cuyo nombre ya existe: si alguien abandonó a medias y
   * volvió a entrar, reintentar no debe dejarle dos "BBVA".
   */
  const terminarArranque = async (r: ArranqueResult) => {
    const yaExisten = new Set(accsRef.current.map((a) => a.name.trim().toLowerCase()));
    for (const [i, c] of r.cuentas.entries()) {
      if (yaExisten.has(c.name.toLowerCase())) continue;
      await api.addAccount({ ...c, color: ACC_COLORS[(accsRef.current.length + i) % ACC_COLORS.length] });
    }
    const cuentas = await api.getAccounts();
    setAccs(cuentas);

    if (r.ingreso) {
      const cuenta = cuentas.find((a) => a.name.trim().toLowerCase() === r.ingreso!.cuenta.trim().toLowerCase());
      // Sin cuenta no hay regla, pero tampoco se aborta el arranque: perder el
      // techo y las cuentas por un ingreso mal atado sería peor.
      if (cuenta) {
        await api.upsertRecurring({
          name: r.ingreso.name,
          kind: "ingreso",
          amount: r.ingreso.amount,
          accountId: cuenta.id,
          category: "Nómina",
          frequency: "mensual",
          next_run: nextMonthlyDate(r.ingreso.dia),
        });
        setRecurring(await api.getRecurring());
        setUpcoming(await api.getUpcoming(7));
      }
    }

    if (r.techo !== null) {
      await api.setMonthlyBudget(r.techo);
      setProfile((p) => (p ? { ...p, monthly_budget: r.techo } : p));
    }

    await cerrarArranque();
    push({ kind: "ok", text: "Listo, tu app ya tiene con qué trabajar" });
  };

  // ── Cola offline ──────────────────────────────────────────────────────────
  const { pending, syncing, enqueue, flush } = useOfflineQueue({
    onSynced: async (n) => {
      const [a, t] = await Promise.all([api.getAccounts(), api.getTxs()]);
      setAccs(a);
      setTxs(t);
      push({ kind: "ok", text: `${n} ${n === 1 ? "movimiento sincronizado" : "movimientos sincronizados"}` });
    },
    onDropped: (p) =>
      push({ kind: "error", text: `No se pudo guardar "${p.description}" (${fmt(p.amount)}). Regístralo de nuevo.` }, 9000),
  });

  // ── Transactions (una RPC atómica por operación; sin ids temporales) ───────
  const applyTx = async (tx: ParsedTx): Promise<{ ok: boolean; error?: string }> => {
    const cur = accsRef.current;
    // Misma resolución que usa el asesor: exacta primero y, si es parcial,
    // solo cuando no hay ambigüedad. El `includes` de antes tomaba la primera
    // coincidencia, así que con "BBVA" y "BBVA Oro" podía cargar el gasto a la
    // cuenta que no era — en silencio.
    let acc: Account;
    try {
      acc = findByName(cur, tx.accountName ?? "", "la cuenta");
    } catch (e: any) {
      return { ok: false, error: e?.message || "No encontré esa cuenta" };
    }
    // Id decidido aquí: si hay que encolarlo, el reintento no lo duplica.
    const clientId = crypto.randomUUID();
    const date = new Date().toISOString();
    const category = tx.category || "Otros";
    const delta = tx.type === "gasto" ? -tx.amount : tx.amount;

    try {
      const saved = await api.applyTx(
        { accountId: acc.id, kind: tx.type, amount: tx.amount, description: tx.description, category, clientId, date },
        cur
      );
      setTxs((p) => [saved, ...p]);
      setAccs((p) => p.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + delta } : a)));
      return { ok: true };
    } catch (e: any) {
      // Sin red no se pierde la captura: se guarda y sale sola al reconectar.
      if (esFalloDeRed(e)) {
        try {
          await enqueue({ id: clientId, accountId: acc.id, accountName: acc.name, kind: tx.type, amount: tx.amount, description: tx.description, category, date });
          setTxs((p) => [
            { id: clientId, description: tx.description, amount: tx.amount, kind: tx.type, type: tx.type, category, categoryId: null, accountId: acc.id, accountName: acc.name, toAccountName: null, date },
            ...p,
          ]);
          setAccs((p) => p.map((a) => (a.id === acc.id ? { ...a, balance: a.balance + delta } : a)));
          push({ kind: "ok", text: "Guardado sin conexión. Se enviará al volver la red." }, 5000);
          return { ok: true };
        } catch (qe) {
          logError(qe, { action: "encolar movimiento offline" });
        }
      }
      console.error(e);
      return { ok: false, error: e?.message || "No se pudo registrar" };
    }
  };

  /** Deshacer de un borrado: vuelve a aplicar el movimiento. */
  const redoTx = async (tx: Transaction) => {
    try {
      const saved = await api.applyTx({ accountId: tx.accountId, kind: tx.kind, amount: tx.amount, description: tx.description, category: tx.category }, accsRef.current);
      setTxs((p) => [saved, ...p].sort((a, b) => b.date.localeCompare(a.date)));
      setAccs((p) => p.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + (tx.type === "gasto" ? -tx.amount : tx.amount) } : a)));
    } catch (e) {
      oops(e, "No se pudo deshacer");
    }
  };

  const deleteTx = async (id: string) => {
    const tx = txsRef.current.find((t) => t.id === id);
    if (!tx) return;
    try {
      await api.deleteTx(id); // reverse_transaction: revierte saldo y efectos en la misma transacción
      setTxs((p) => p.filter((t) => t.id !== id));
      if (tx.kind === "gasto" || tx.kind === "ingreso") {
        const delta = tx.type === "gasto" ? tx.amount : -tx.amount;
        setAccs((p) => p.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + delta } : a)));
        push({ kind: "ok", text: `Eliminado: ${tx.description}`, action: { label: "Deshacer", onClick: () => redoTx(tx) } }, 6000);
      } else {
        // transferencia / pago / abono: el servidor revirtió varios saldos — recargar lo afectado
        api.getAccounts().then(setAccs).catch(console.error);
        if (tx.kind === "pago_credito") api.getCredits().then(setCredits).catch(console.error);
        if (tx.kind === "abono_meta") api.getGoals().then(setGoals).catch(console.error);
        push({ kind: "ok", text: "Movimiento eliminado y saldos revertidos" });
      }
    } catch (e) {
      oops(e, "No se pudo eliminar");
    }
  };

  // ── Accounts ───────────────────────────────────────────────────────────────
  const applyNewAcc = async (d: ParsedNewAcc) => {
    const cur = accsRef.current;
    const color = ACC_COLORS[cur.length % ACC_COLORS.length];
    try {
      const s = await api.addAccount({ name: d.accountName, balance: d.balance ?? 0, color, icon: d.icon ?? "🏦", currency: d.currency ?? "MXN" });
      setAccs((p) => [...p, s]);
    } catch (e) {
      oops(e, "No se pudo crear la cuenta");
    }
  };
  const saveNewAcc = async () => {
    if (!newAcc.name.trim()) return;
    await applyNewAcc({ accountName: newAcc.name.trim(), balance: parseFloat(String(newAcc.balance) || "0"), icon: newAcc.icon, currency: newAcc.currency });
    setNewAcc({ name: "", balance: "", icon: "🏦", currency: "MXN" });
    setMNewAcc(false);
  };
  const saveEditAcc = async () => {
    if (!editAcc || !editAcc.name.trim()) return;
    const prev = accs;
    setAccs((p) => p.map((a) => (a.id === editAcc.id ? { ...a, ...editAcc, balance: Number(editAcc.balance) } : a)));
    setEditAcc(null);
    try {
      await api.updateAccount({ id: editAcc.id, name: editAcc.name, balance: parseFloat(String(editAcc.balance)), icon: editAcc.icon, color: editAcc.color, currency: editAcc.currency });
    } catch (e) {
      setAccs(prev);
      oops(e, "No se pudo guardar la cuenta");
    }
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
      oops(e, "No se pudo crear el crédito");
    }
  };
  const saveEditCredit = async (f: CreditFormState) => {
    if (!f.name.trim()) return;
    const p = { id: f.id!, ...parseCredit(f) };
    const prev = credits;
    setCredits((pr) => pr.map((c) => (c.id === f.id ? { ...c, ...p } : c)));
    setEditCredit(null);
    try {
      await api.updateCredit(p);
    } catch (e) {
      setCredits(prev);
      oops(e, "No se pudo guardar el crédito");
    }
  };
  const deleteCredit = async (id: string) => {
    const prev = credits;
    setCredits((p) => p.filter((c) => c.id !== id));
    setEditCredit(null);
    try {
      await api.deleteCredit(id);
    } catch (e) {
      setCredits(prev);
      oops(e, "No se pudo eliminar el crédito");
    }
  };

  // ── Budgets ────────────────────────────────────────────────────────────────
  const saveBudget = async () => {
    const amount = parseFloat(budgetAmt);
    if (!amount || amount <= 0) return;
    try {
      const saved = await api.upsertBudget({ category: budgetCat, amount, rollover: budgetRollover });
      setBudgets((p) => {
        const exists = p.some((b) => b.id === saved.id);
        return exists ? p.map((b) => (b.id === saved.id ? saved : b)) : [...p, saved];
      });
    } catch (e) {
      oops(e, "No se pudo guardar el presupuesto");
    }
    setBudgetAmt("");
    setBudgetRollover(false);
    setMBudget(false);
  };
  const deleteBudget = async (id: string) => {
    const prev = budgets;
    setBudgets((p) => p.filter((b) => b.id !== id));
    try {
      await api.deleteBudget(id);
    } catch (e) {
      setBudgets(prev);
      oops(e, "No se pudo eliminar el presupuesto");
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
      oops(e, "No se pudo crear la meta");
    }
  };
  const saveEditGoal = async () => {
    if (!editGoal) return;
    const p = { id: editGoal.id!, name: editGoal.name, target_amount: parseFloat(String(editGoal.target_amount)), current_amount: parseFloat(String(editGoal.current_amount || 0)), target_date: editGoal.target_date || null, icon: editGoal.icon, color: editGoal.color, notes: editGoal.notes || null };
    const prev = goals;
    setGoals((pr) => pr.map((g) => (g.id === editGoal.id ? { ...g, ...p } : g)));
    setEditGoal(null);
    try {
      await api.updateGoal(p);
    } catch (e) {
      setGoals(prev);
      oops(e, "No se pudo guardar la meta");
    }
  };
  const deleteGoal = async (id: string) => {
    const prev = goals;
    setGoals((p) => p.filter((g) => g.id !== id));
    setEditGoal(null);
    try {
      await api.deleteGoal(id);
    } catch (e) {
      setGoals(prev);
      oops(e, "No se pudo eliminar la meta");
    }
  };
  const addToGoal = async () => {
    if (!mAddToGoal || !addGoalAmt) return;
    const amount = parseFloat(addGoalAmt);
    if (!amount || amount <= 0) return;
    const accountId = addGoalAcc || null;
    setMAddToGoal(null);
    setAddGoalAmt("");
    setAddGoalAcc("");
    try {
      const updated = await api.contributeGoal({ goalId: mAddToGoal.id, amount, accountId });
      setGoals((p) => p.map((g) => (g.id === updated.id ? updated : g)));
      if (accountId) {
        // El abono salió de una cuenta real: refrescar saldo e historial
        const [a, t] = await Promise.all([api.getAccounts(), api.getTxs()]);
        setAccs(a);
        setTxs(t);
      }
      push({ kind: "ok", text: `Abonaste ${fmt(amount)} a ${updated.name}` });
    } catch (e) {
      oops(e, "No se pudo abonar");
    }
  };

  // ── Flujos de dinero (cada uno es una RPC atómica en Postgres) ─────────────
  const doTransfer = async (p: { fromId: string; toId: string; amount: number; description: string }) => {
    const saved = await api.transfer(p, accsRef.current);
    setTxs((prev) => [saved, ...prev]);
    setAccs((prev) => prev.map((a) =>
      a.id === p.fromId ? { ...a, balance: a.balance - p.amount }
      : a.id === p.toId ? { ...a, balance: a.balance + p.amount }
      : a
    ));
    setMTransfer(false);
    const from = accsRef.current.find((a) => a.id === p.fromId)?.name ?? "";
    const to = accsRef.current.find((a) => a.id === p.toId)?.name ?? "";
    push({ kind: "ok", text: `${fmt(p.amount)} de ${from} a ${to}` });
  };

  const doPayCredit = async (p: { creditId: string; accountId: string; amount: number }) => {
    const saved = await api.payCredit(p, accsRef.current);
    setTxs((prev) => [saved, ...prev]);
    setAccs((prev) => prev.map((a) => (a.id === p.accountId ? { ...a, balance: a.balance - p.amount } : a)));
    setCredits((prev) => prev.map((c) => (c.id === p.creditId ? { ...c, total_debt: Math.max(c.total_debt - p.amount, 0) } : c)));
    setPayCredit(null);
    push({ kind: "ok", text: `Pago de ${fmt(p.amount)} registrado` });
  };

  const doEditTx = async (p: { id: string; accountId: string; kind: TxType; amount: number; description: string; category: string; date: string }) => {
    const saved = await api.updateTx(p, accsRef.current);
    setTxs((prev) => prev.map((t) => (t.id === saved.id ? saved : t)).sort((a, b) => b.date.localeCompare(a.date)));
    // Editar puede mover monto y cuenta a la vez: el servidor ya reajustó, refrescamos
    api.getAccounts().then(setAccs).catch(console.error);
    setEditTx(null);
    push({ kind: "ok", text: "Movimiento actualizado" });
  };

  // ── Movimientos fijos ─────────────────────────────────────────────────────
  const refreshRecurring = async () => {
    const [rr, up] = await Promise.all([api.getRecurring(), api.getUpcoming(7)]);
    setRecurring(rr);
    setUpcoming(up);
  };

  const saveRecurring = async (p: Parameters<typeof api.upsertRecurring>[0]) => {
    await api.upsertRecurring(p);
    await refreshRecurring();
    setMRecurring(false);
    setEditRecurring(null);
    push({ kind: "ok", text: p.id ? "Movimiento fijo actualizado" : `"${p.name}" se registrará ${p.frequency === "mensual" ? "cada mes" : "según lo programado"}` });
  };

  const toggleRecurring = async (r: RecurringRule) => {
    setRecurring((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    try {
      await api.setRecurringActive(r.id, !r.active);
      setUpcoming(await api.getUpcoming(7));
    } catch (e) {
      setRecurring((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: r.active } : x)));
      oops(e, "No se pudo cambiar el estado");
    }
  };

  const deleteRecurring = async (id: string) => {
    setEditRecurring(null);
    try {
      await api.deleteRecurring(id);
      await refreshRecurring();
      push({ kind: "ok", text: "Movimiento fijo eliminado" });
    } catch (e) {
      oops(e, "No se pudo eliminar");
    }
  };

  // ── Confirmaciones (borrados que no tienen deshacer) ──────────────────────
  const askDeleteCredit = (id: string, name: string) =>
    setConfirm({ title: `¿Eliminar ${name}?`, message: "Se borra el crédito y su historial de pagos. Los movimientos ya registrados en tus cuentas se quedan.", action: () => deleteCredit(id) });

  const askDeleteGoal = (id: string, name: string) =>
    setConfirm({ title: `¿Eliminar la meta ${name}?`, message: "Se borra la meta y su historial de abonos. El dinero que ya salió de tus cuentas no se devuelve.", action: () => deleteGoal(id) });

  const askDeleteBudget = (id: string) => {
    const b = budgets.find((x) => x.id === id);
    setConfirm({ title: `¿Quitar el presupuesto de ${b?.category ?? ""}?`, message: "Dejarás de ver el avance y la alerta al 90% de esta categoría.", confirmLabel: "Quitar", action: () => deleteBudget(id) });
  };

  const askDeleteRecurring = (id: string, name: string) =>
    setConfirm({ title: `¿Eliminar ${name}?`, message: "Dejará de generarse. Los movimientos que ya creó se quedan en tu historial.", action: () => deleteRecurring(id) });

  /** Una cuenta con historial se archiva; una sin movimientos se elimina. */
  const askRemoveAccount = async (acc: EditAccState) => {
    let n = 0;
    try {
      n = await api.countAccountTxs(acc.id);
    } catch (e) {
      oops(e, "No se pudo revisar la cuenta");
      return;
    }
    setEditAcc(null);
    if (n > 0) {
      setConfirm({
        title: `¿Archivar ${acc.name}?`,
        message: `Tiene ${n} ${n === 1 ? "movimiento" : "movimientos"}, así que no se puede borrar sin perder historial. Al archivarla sale del saldo total y de los selectores, pero sus movimientos siguen en el historial.`,
        confirmLabel: "Archivar",
        action: async () => {
          try {
            await api.archiveAccount(acc.id);
            setAccs((p) => p.filter((a) => a.id !== acc.id));
            push({ kind: "ok", text: `${acc.name} archivada` });
          } catch (e) { oops(e, "No se pudo archivar"); }
        },
      });
    } else {
      setConfirm({
        title: `¿Eliminar ${acc.name}?`,
        message: "No tiene movimientos, así que se borra por completo.",
        action: async () => {
          try {
            await api.deleteAccount(acc.id);
            setAccs((p) => p.filter((a) => a.id !== acc.id));
            push({ kind: "ok", text: `${acc.name} eliminada` });
          } catch (e) { oops(e, "No se pudo eliminar"); }
        },
      });
    }
  };

  // ── AI + voz ───────────────────────────────────────────────────────────────
  const saveCategory = async (d: Parameters<typeof api.upsertCategory>[0]) => {
    await api.upsertCategory(d);
    setCategories(await api.getCategories());
    push({ kind: "ok", text: d.id ? "Categoría actualizada" : `Categoría "${d.name}" creada` });
  };

  const toggleCategoryHidden = async (c: { id: string; hidden: boolean; name: string }) => {
    setCategories((p) => p.map((x) => (x.id === c.id ? { ...x, hidden: !c.hidden } : x)));
    try {
      await api.setCategoryHidden(c.id, !c.hidden);
    } catch (e) {
      setCategories((p) => p.map((x) => (x.id === c.id ? { ...x, hidden: c.hidden } : x)));
      oops(e, "No se pudo cambiar la categoría");
    }
  };

  const runImport = async (rows: { date: Date; description: string; amount: number; kind: TxType }[], accountId: string) => {
    const n = await api.importTxs(
      rows.map((r) => ({ accountId, kind: r.kind, amount: r.amount, description: r.description, date: r.date.toISOString() }))
    );
    // El servidor movió saldos e insertó en bloque: se recarga lo afectado.
    const [a, t] = await Promise.all([api.getAccounts(), api.getTxs()]);
    setAccs(a);
    setTxs(t);
    setMImport(false);
    push({ kind: "ok", text: `${n} ${n === 1 ? "movimiento importado" : "movimientos importados"}` });
    return n;
  };

  const saveTotalBudget = async (amount: number | null) => {
    await api.setMonthlyBudget(amount);
    setProfile((p) => (p ? { ...p, monthly_budget: amount } : p));
    setMTotalBudget(false);
    push({ kind: "ok", text: amount ? `Techo mensual fijado en ${fmt(amount)}` : "Techo mensual quitado" });
  };

  const actionContext = () => ({ accs: accsRef.current, credits: creditsRef.current, goals: goalsRef.current });

  /** Tras ejecutar una acción del asesor, recargar lo que pudo cambiar. */
  const reloadAfterAction = async () => {
    const [a, t, cr, b, g] = await Promise.all([
      api.getAccounts(), api.getTxs(), api.getCredits(), api.getBudgets(), api.getGoals(),
    ]);
    setAccs(a); setTxs(t); setCredits(cr); setBudgets(b); setGoals(g);
  };

  const { txLoading, sendTx, draft, draftError, updateDraft, confirmDraft, discardDraft, aiMsgs, aiInput, setAiInput, aiLoading, sendAnalysis, confirmAction, dismissAction } =
    useAI({ applyTx, applyNewAcc, setTxInput, setLive, categoryNames: () => categories.filter((c) => !c.hidden).map((c) => c.name), actionContext, onActionDone: reloadAfterAction });

  const { mic, voiceOK, startMic, stopMic } = useVoice({
    onResult: (t) => { setLive(t); setTxInput(t); },
    // El sheet YA NO se cierra al terminar de hablar: lo que sigue es el
    // borrador con los chips, y cerrarlo lo dejaría sin dónde aparecer.
    onFinal: (final) => { sendTx(final.trim()); },
    onStop: () => setLive(""),
  });
  useEffect(() => { if (!fab) stopMic(); }, [fab, stopMic]);

  const saveTxManual = async () => {
    const { desc, amt, type, aid, cat } = man;
    if (!desc || !amt || !aid) return;
    const amount = parseFloat(amt);
    if (!amount || amount <= 0) { push({ kind: "error", text: "El monto debe ser mayor a cero" }); return; }
    const r = await applyTx({ description: desc, amount, type, category: cat, accountName: accs.find((a) => a.id === aid)?.name ?? "" });
    if (!r.ok) { push({ kind: "error", text: r.error || "No se pudo registrar" }); return; }
    setMan({ desc: "", amt: "", type: "gasto", aid: "", cat: "Otros" });
    setMMan(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  // El período manda sobre todas las cifras del dashboard, y transferencias,
  // pagos y abonos quedan fuera de gastos/ingresos: mueven dinero, no lo consumen.
  const periodTxs = useMemo(() => filterByPeriod(txs, period), [txs, period]);
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  // Consolidado en pesos: una cuenta en dólares no puede sumarse tal cual.
  const totBal = accs.reduce((s, a) => s + toBase(Number(a.balance), a.currency, fx), 0);
  const totG = useMemo(() => sumSpend(periodTxs), [periodTxs]);
  const totI = useMemo(() => sumIncome(periodTxs), [periodTxs]);
  const totalDebt = credits.reduce((s, c) => s + Number(c.total_debt || 0), 0);
  const netWorth = useMemo(() => netWorthHistory(accs, credits, txs, 6, new Date(), fx), [accs, credits, txs, fx]);

  const projection = useMemo(() => {
    const now = new Date();
    const monthTxs = txs.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return projectMonth(monthTxs, upcoming, now);
  }, [txs, upcoming]);

  const upcomingNet = useMemo(
    () => upcoming.reduce((s, u) => s + (u.kind === "ingreso" ? u.amount : -u.amount), 0),
    [upcoming]
  );

  const urgentCredits = useMemo(() => credits.filter((c) => {
    const d1 = daysUntil(c.payment_day);
    const d2 = daysUntilDate(c.next_payment_date);
    return (d1 !== null && d1 <= 5) || (d2 !== null && d2 <= 5);
  }), [credits]);

  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    periodTxs.filter((t) => t.kind === "gasto").forEach((t) => { const c = t.category || "Otros"; map[c] = (map[c] || 0) + Number(t.amount); });
    return Object.entries(map).map(([label, value]) => {
      const c = categories.find((x) => x.name === label);
      return { label, value, color: c?.color || "#6b7280", icon: c?.icon || "📦" };
    }).sort((a, b) => b.value - a.value);
  }, [periodTxs, categories]);

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
      months.push({ label: monthLabel(d), ingresos: sumIncome(mt), gastos: sumSpend(mt) });
    }
    return months;
  }, [txs]);

  // Month comparison
  const comparison = useMemo<Comparison>(() => {
    const now = new Date();
    const thisM = txs.filter((t) => { const d = new Date(t.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
    const lastD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastM = txs.filter((t) => { const d = new Date(t.date); return d.getFullYear() === lastD.getFullYear() && d.getMonth() === lastD.getMonth(); });
    const tG = sumSpend(thisM);
    const lG = sumSpend(lastM);
    const tI = sumIncome(thisM);
    const lI = sumIncome(lastM);
    const diff = lG > 0 ? Math.round(((tG - lG) / lG) * 100) : null;
    return { thisGastos: tG, lastGastos: lG, thisIngresos: tI, lastIngresos: lI, diffPct: diff };
  }, [txs]);

  // Presupuestos con arrastre del mes anterior
  const budgetProgress = useMemo<BudgetWithProgress[]>(() => calcBudgets(budgets, txs), [budgets, txs]);

  const totalBudget = useMemo(
    () => totalBudgetStatus(profile?.monthly_budget ?? null, projection.spentSoFar, projection.projectedSpend),
    [profile, projection]
  );

  // Avisos: la clave incluye a qué vencimiento corresponde, así que al
  // descartarlo no vuelve hasta que haya algo nuevo que avisar.
  const creditKey = useMemo(
    () => creditAlertKey(urgentCredits.map((c) => ({ id: c.id, days: Math.min(daysUntil(c.payment_day) ?? 99, daysUntilDate(c.next_payment_date) ?? 99) }))),
    [urgentCredits]
  );
  const budgetOver = useMemo(() => budgetProgress.filter((b) => b.pct >= 90).map((b) => b.category), [budgetProgress]);
  const budgetKey = useMemo(() => budgetAlertKey(budgetOver), [budgetOver]);

  // alertTick fuerza el recálculo al descartar: lo descartado vive fuera de React.
  const showCreditAlert = urgentCredits.length > 0 && alertTick >= 0 && !isDismissed(creditKey);
  const showBudgetAlert = budgetOver.length > 0 && alertTick >= 0 && !isDismissed(budgetKey);

  const hideAlert = (key: string) => { dismissAlert(key); setAlertTick((t) => t + 1); };


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

  // Sin constancia de aceptación no se entra. Cubre a las cuentas que existían
  // antes de que hubiera aviso, y a todas cuando el texto cambie de versión.
  if (profile && profile.legal_version !== LEGAL_VERSION) return (
    <LegalGate
      nuevaVersion={!!profile.legal_accepted_at}
      onAccept={aceptarLegal}
      onSignOut={onSignOut}
    />
  );

  // El muro va después del portón legal —los términos que lo explican hay que
  // aceptarlos primero— y antes del arranque: no tiene sentido pedirle a
  // alguien que configure una app que no va a poder usar.
  if (profile && diasDePrueba === 0) return (
    <>
      <FinDePrueba txs={txs} onSignOut={onSignOut} onDeleteAccount={pedirBorrado} />
      {/* Se re-montan aquí: el resto de la app no se renderiza en este camino */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      )}
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </>
  );

  // Va después del portón legal a propósito: primero se acepta el aviso, y
  // solo entonces tiene sentido pedirle datos a alguien.
  if (profile && !profile.onboarded_at) return (
    <Arranque
      nombre={userName}
      cuentasExistentes={accs.map((a) => a.name)}
      onFinish={terminarArranque}
      onSkip={cerrarArranque}
    />
  );

  return (
    <CategoriesProvider categories={categories.filter((c) => !c.hidden)}>
    <div style={{ minHeight: "100dvh", background: C.bg }}>
      {/* Header pegado arriba: en la PWA de iOS scrollea la página entera,
          asi que sin sticky el encabezado se iba con el scroll. */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: C.surface, borderBottom: `1px solid ${C.border}22`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)" }}>
        {/* El nombre es la entrada a Perfil: la barra de abajo ya tiene seis
            pestañas y una séptima las dejaba ilegibles en un teléfono. */}
        <div onClick={() => setTab("perfil")} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.aLight, letterSpacing: -0.5 }}>Millions</div>
          <div style={{ fontSize: 11, color: tab === "perfil" ? C.aLight : C.muted, marginTop: 1 }}>
            👤 {userName}{hasForeign(accs) ? " · totales en MXN" : ""} ›
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: `linear-gradient(135deg,${C.accent},#9333ea)`, color: "#fff", borderRadius: 12, padding: "6px 14px", fontSize: 13, fontWeight: 800, boxShadow: "0 4px 12px #7c6af733" }}>{fmt(totBal)}</div>
          {pending > 0 && (
            <button
              onClick={() => flush()}
              title="Movimientos guardados sin conexión. Toca para intentar enviarlos."
              style={{ background: C.amber + "22", border: `1px solid ${C.amber}55`, borderRadius: 10, color: C.amber, fontSize: 12, fontWeight: 700, padding: "6px 10px", cursor: "pointer" }}
            >
              {syncing ? "⟳" : "☁"} {pending}
            </button>
          )}
        </div>
      </div>

      {/* Baja pendiente: este aviso NO se puede descartar. Olvidar que tu
          cuenta se borra en unos días es exactamente lo que no debe pasar. */}
      {diasParaBorrado !== null && (
        <div onClick={() => setTab("perfil")} style={{ background: C.red + "18", borderBottom: `1px solid ${C.red}33`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 18 }}>🗑️</span>
          <span style={{ flex: 1, fontSize: 13, color: C.red, fontWeight: 600 }}>
            Tu cuenta se borrará {diasParaBorrado === 0 ? "hoy" : `en ${diasParaBorrado} ${diasParaBorrado === 1 ? "día" : "días"}`} — Toca para cancelar
          </span>
        </div>
      )}

      {/* Última semana de prueba. No se descarta: enterarse el día 31 de que
          la app se cerró es exactamente lo que este aviso viene a evitar. */}
      {avisarPrueba && (
        <div style={{ background: C.amber + "18", borderBottom: `1px solid ${C.amber}33`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <span style={{ flex: 1, fontSize: 13, color: C.amber, fontWeight: 600 }}>
            {diasDePrueba === 1 ? "Tu prueba termina mañana" : `Tu prueba termina en ${diasDePrueba} días`}
          </span>
        </div>
      )}

      {/* Avisos: la ✕ los descarta hasta que cambie la situación */}
      {showCreditAlert && (
        <div style={{ background: C.red + "18", borderBottom: `1px solid ${C.red}33`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span onClick={() => setTab("creditos")} style={{ flex: 1, fontSize: 13, color: C.red, fontWeight: 600, cursor: "pointer" }}>
            {urgentCredits.length === 1 ? `Pago próximo: ${urgentCredits[0].name}` : `${urgentCredits.length} pagos próximos`} — Toca para ver
          </span>
          <button onClick={() => hideAlert(creditKey)} title="No volver a mostrar este aviso" style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 15, padding: "2px 6px", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {showBudgetAlert && (
        <div style={{ background: C.amber + "18", borderBottom: `1px solid ${C.amber}33`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span onClick={() => setTab("metas")} style={{ flex: 1, fontSize: 13, color: C.amber, fontWeight: 600, cursor: "pointer" }}>
            Presupuesto al límite: {budgetOver.join(", ")} — Toca para ver
          </span>
          <button onClick={() => hideAlert(budgetKey)} title="No volver a mostrar este aviso" style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", fontSize: 15, padding: "2px 6px", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* El padding inferior deja libre la barra de pestañas fija */}
      <div style={{ padding: "16px 14px calc(env(safe-area-inset-bottom,0px) + 150px)", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        {tab === "dash" && <Dashboard accs={accs} txs={txs} totBal={totBal} totI={totI} totG={totG} totalDebt={totalDebt} upcoming={upcoming} upcomingNet={upcomingNet} netWorth={netWorth} projection={projection} fx={fx} period={period} onPeriod={setPeriod} periodLabel={periodLabel} comparison={comparison} monthlyData={monthlyData} catData={catData} onEditAcc={(a) => setEditAcc({ ...a })} onNewAcc={() => setMNewAcc(true)} onGoHist={() => setTab("hist")} />}
        {tab === "metas" && <Metas budgetProgress={budgetProgress} totalBudget={totalBudget} onSetTotalBudget={() => setMTotalBudget(true)} goals={goals} recurring={recurring} onNewRecurring={() => setMRecurring(true)} onEditRecurring={setEditRecurring} onToggleRecurring={toggleRecurring} onAddBudget={() => setMBudget(true)} onManageCategories={() => setMCats(true)} onDeleteBudget={askDeleteBudget} onNewGoal={() => { setGoalForm(emptyGoalForm); setMGoal(true); }} onEditGoal={(g) => setEditGoal({ ...g })} onAddToGoal={setMAddToGoal} />}
        {tab === "creditos" && <Creditos credits={credits} totalDebt={totalDebt} onEdit={(c) => setEditCredit({ ...c })} onAdd={() => setMCredit(true)} onPay={setPayCredit} />}
        {tab === "analisis" && <Analisis aiMsgs={aiMsgs} aiLoading={aiLoading} aiInput={aiInput} setAiInput={setAiInput} onSend={sendAnalysis} actionContext={actionContext} onConfirmAction={confirmAction} onDismissAction={dismissAction} />}
        {tab === "hist" && <Historial txs={txs} accs={accs} onDelete={deleteTx} onEdit={setEditTx} onImport={() => setMImport(true)} />}
        {tab === "accs" && <Cuentas accs={accs} txs={txs} fx={fx} onEdit={(a) => setEditAcc({ ...a })} onNew={() => setMNewAcc(true)} />}
        {tab === "perfil" && <Perfil profile={profile} email={session.user?.email ?? ""} txs={txs} onChangePassword={() => setMPass(true)} onSignOut={onSignOut} onDeleteAccount={pedirBorrado} onCancelDeletion={cancelarBorrado} />}
      </div>

      {/* Barra de pestañas fija abajo: en un teléfono el pulgar llega ahí,
          y así no se pierde al scrollear. */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, display: "flex", background: C.surface, borderTop: `1px solid ${C.border}33`, paddingBottom: "env(safe-area-inset-bottom,0px)", boxShadow: "0 -4px 16px #00000055" }}>
        {([["dash", "📊", "Inicio"], ["metas", "🎯", "Metas"], ["creditos", "💳", "Créditos"], ["analisis", "🤖", "Análisis"], ["hist", "📋", "Historial"], ["accs", "🏦", "Cuentas"]] as [Tab, string, string][]).map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, minWidth: 0, padding: "9px 2px 7px", background: "none", border: "none", cursor: "pointer", borderTop: tab === k ? `2px solid ${C.accent}` : "2px solid transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 9, color: tab === k ? C.aLight : C.muted, fontWeight: tab === k ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* FAB + sheet */}
      <Fab
        fab={fab}
        // Un solo toque para empezar a hablar: abrir el sheet enciende el
        // micrófono. `startMic` corre dentro del gesto del click, que es lo
        // que el navegador exige para conceder el permiso.
        onOpen={() => { setFab(true); startMic(); }}
        onClose={() => setFab(false)}
        mic={mic} live={live} txLoading={txLoading} txInput={txInput} setTxInput={setTxInput}
        voiceOK={voiceOK} startMic={startMic} stopMic={stopMic} onSend={sendTx}
        onManual={() => { setFab(false); setMMan(true); }}
        onTransfer={() => { setFab(false); setMTransfer(true); }}
        accs={accs}
        draft={draft}
        draftError={draftError}
        updateDraft={updateDraft}
        onConfirmDraft={async () => { if (await confirmDraft()) setFab(false); }}
        onDiscardDraft={() => { discardDraft(); setFab(false); }}
      />

      {/* Toasts */}
      <Toasts toasts={toasts} onDismiss={dismiss} />

      {/* Modal: Nueva cuenta */}
      {mNewAcc && <AccountModal mode="new" form={newAcc} update={(p) => setNewAcc((f) => ({ ...f, ...p }))} onSave={saveNewAcc} onClose={() => setMNewAcc(false)} />}

      {/* Modal: Editar cuenta */}
      {editAcc && <AccountModal mode="edit" form={editAcc} update={(p) => setEditAcc((a) => (a ? { ...a, ...p } : a))} onSave={saveEditAcc} onRemove={() => askRemoveAccount(editAcc)} onClose={() => setEditAcc(null)} />}

      {/* Modal: Créditos */}
      {mCredit && <Modal onClose={() => setMCredit(false)}><CreditForm onSave={saveNewCredit} onClose={() => setMCredit(false)} /></Modal>}
      {editCredit && <Modal onClose={() => setEditCredit(null)}><CreditForm initial={editCredit} onSave={saveEditCredit} onDelete={(id) => askDeleteCredit(id, editCredit.name)} onClose={() => setEditCredit(null)} /></Modal>}

      {/* Modal: Nuevo presupuesto */}
      {mBudget && <BudgetModal budgetCat={budgetCat} budgetAmt={budgetAmt} onCat={setBudgetCat} onAmt={setBudgetAmt} rollover={budgetRollover} onRollover={setBudgetRollover} onSave={saveBudget} onClose={() => setMBudget(false)} />}

      {/* Modal: Nueva meta */}
      {mGoal && <GoalModal mode="new" form={goalForm} update={(p) => setGoalForm((f) => ({ ...f, ...p }))} onSave={saveNewGoal} onClose={() => setMGoal(false)} />}

      {/* Modal: Editar meta */}
      {editGoal && <GoalModal mode="edit" form={editGoal} update={(p) => setEditGoal((f) => (f ? { ...f, ...p } : f))} onSave={saveEditGoal} onDelete={(id) => askDeleteGoal(id, editGoal.name)} onClose={() => setEditGoal(null)} />}

      {/* Modal: Abonar a meta */}
      {mAddToGoal && <AddToGoalModal goal={mAddToGoal} accs={accs} amount={addGoalAmt} onAmount={setAddGoalAmt} accountId={addGoalAcc} onAccount={setAddGoalAcc} onSave={addToGoal} onClose={() => { setMAddToGoal(null); setAddGoalAmt(""); setAddGoalAcc(""); }} />}

      {/* Modal: Transferir entre cuentas */}
      {mTransfer && <TransferModal accs={accs} onSave={doTransfer} onClose={() => setMTransfer(false)} />}

      {/* Modal: Pagar crédito */}
      {payCredit && <PayCreditModal credit={payCredit} accs={accs} onSave={doPayCredit} onClose={() => setPayCredit(null)} />}

      {/* Modal: Movimiento fijo */}
      {(mRecurring || editRecurring) && (
        <RecurringModal
          rule={editRecurring}
          accs={accs}
          onSave={saveRecurring}
          onDelete={(id) => askDeleteRecurring(id, editRecurring?.name ?? "")}
          onClose={() => { setMRecurring(false); setEditRecurring(null); }}
        />
      )}

      {/* Modal: Editar movimiento */}
      {editTx && <EditTxModal tx={editTx} accs={accs} onSave={doEditTx} onClose={() => setEditTx(null)} />}

      {/* Modal: Entrada manual */}
      {mMan && <ManualTxModal form={man} update={(p) => setMan((f) => ({ ...f, ...p }))} accs={accs} onSave={saveTxManual} onClose={() => setMMan(false)} />}

      {/* Modal: Importar CSV */}
      {mImport && <ImportCsvModal accs={accs} txs={txs} onImport={runImport} onClose={() => setMImport(false)} />}

      {/* Modal: Techo mensual */}
      {mTotalBudget && <TotalBudgetModal current={profile?.monthly_budget ?? null} spentThisMonth={projection.spentSoFar} onSave={saveTotalBudget} onClose={() => setMTotalBudget(false)} />}

      {/* Modal: Categorías */}
      {mCats && <CategoriesModal categories={categories} onSave={saveCategory} onToggleHidden={toggleCategoryHidden} onClose={() => setMCats(false)} />}

      {/* Confirmación de borrados */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* Modal: Cambiar contraseña */}
      {mPass && <PasswordModal onDone={() => { setMPass(false); push({ kind: "ok", text: "Contraseña actualizada" }); }} onClose={() => setMPass(false)} />}
    </div>
    </CategoriesProvider>
  );
}
