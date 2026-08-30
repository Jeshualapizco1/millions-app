import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Account, Budget, Credit, Goal, Transaction } from "../types";

/** Carga inicial + estado de accounts/txs/credits/budgets/goals, con refs espejo para callbacks. */
export function useFinanceData() {
  const [accs, setAccs] = useState<Account[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
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
    Promise.all([api.getCategories(), api.getAccounts(), api.getTxs(), api.getCredits(), api.getBudgets(), api.getGoals()])
      .then(([, a, t, cr, b, g]) => {
        setAccs(a);
        setTxs(t);
        setCredits(cr);
        setBudgets(b);
        setGoals(g);
      })
      .catch((e) => {
        console.error(e);
        setLoadError(e?.message || "No se pudieron cargar tus datos");
      })
      .finally(() => setBooting(false));
  }, []);

  return {
    accs, setAccs, txs, setTxs, credits, setCredits, budgets, setBudgets, goals, setGoals,
    booting, loadError, accsRef, txsRef, creditsRef, budgetsRef, goalsRef,
  };
}
