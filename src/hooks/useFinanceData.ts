import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { logError } from "../lib/errorLog";
import type { Account, Budget, Category, Credit, Goal, Profile, RecurringRule, Transaction, Upcoming } from "../types";
import type { FxRates } from "../lib/currency";

/** Carga inicial + estado de accounts/txs/credits/budgets/goals, con refs espejo para callbacks. */
export function useFinanceData() {
  const [accs, setAccs] = useState<Account[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fx, setFx] = useState<FxRates>({});
  const [booting, setBooting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const accsRef = useRef(accs);
  const txsRef = useRef(txs);
  const creditsRef = useRef(credits);
  const budgetsRef = useRef(budgets);
  const goalsRef = useRef(goals);
  useEffect(() => { accsRef.current = accs; }, [accs]);
  useEffect(() => { txsRef.current = txs; }, [txs]);
  useEffect(() => { creditsRef.current = credits; }, [credits]);
  useEffect(() => { budgetsRef.current = budgets; }, [budgets]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getAccounts(), api.getTxs(), api.getCredits(), api.getBudgets(), api.getGoals(), api.getRecurring(), api.getUpcoming(7), api.getProfile(), api.getFxRates()])
      .then(([cats, a, t, cr, b, g, rr, up, prof, rates]) => {
        setProfile(prof);
        setFx(rates);
        setCategories(cats);
        setAccs(a);
        setTxs(t);
        setCredits(cr);
        setBudgets(b);
        setGoals(g);
        setRecurring(rr);
        setUpcoming(up);
      })
      .catch((e) => {
        console.error(e);
        logError(e, { action: "carga inicial de datos" });
        setLoadError(e?.message || "No se pudieron cargar tus datos");
      })
      .finally(() => setBooting(false));
  }, []);

  return {
    accs, setAccs, txs, setTxs, credits, setCredits, budgets, setBudgets, goals, setGoals,
    recurring, setRecurring, upcoming, setUpcoming, categories, setCategories, profile, setProfile, fx,
    booting, loadError, accsRef, txsRef, creditsRef, budgetsRef, goalsRef,
  };
}
