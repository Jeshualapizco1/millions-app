import { useCallback, useEffect, useRef, useState } from "react";
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

  const cargar = useCallback(() =>
    Promise.all([api.getCategories(), api.getAccounts(), api.getTxs(), api.getCredits(), api.getBudgets(), api.getGoals(), api.getRecurring(), api.getUpcoming(7), api.getProfile(), api.getFxRates()]), []);

  const aplicar = useCallback(([cats, a, t, cr, b, g, rr, up, prof, rates]: Awaited<ReturnType<typeof cargar>>) => {
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
  }, []);

  /**
   * Recarga en segundo plano, al volver a la app. Si falla no se grita: los
   * datos en pantalla simplemente siguen siendo los de antes, que es mucho
   * mejor que un error encima de una app que funciona. Queda en el registro.
   */
  const recargar = useCallback(async () => {
    try {
      aplicar(await cargar());
    } catch (e) {
      logError(e, { action: "recarga al volver a la app" });
    }
  }, [cargar, aplicar]);

  useEffect(() => {

    /**
     * El reloj del teléfono puede ir unos segundos adelantado respecto al
     * servidor, y entonces el token queda "emitido en el futuro" y la base lo
     * rechaza. Pasa sobre todo al abrir la PWA tras horas cerrada. Esperar un
     * momento y reintentar lo resuelve; fallar de golpe obligaba a recargar
     * a mano sin saber por qué.
     */
    const esDesfaseDeReloj = (e: unknown) =>
      /issued at future|jwt|token is expired|invalid claim/i.test(String((e as Error)?.message ?? e));

    cargar()
      .then(aplicar)
      .catch(async (e) => {
        if (!esDesfaseDeReloj(e)) throw e;
        await new Promise((r) => setTimeout(r, 2500));
        return cargar().then(aplicar);
      })
      .catch((e) => {
        console.error(e);
        logError(e, { action: "carga inicial de datos" });
        setLoadError(e?.message || "No se pudieron cargar tus datos");
      })
      .finally(() => setBooting(false));
  }, [cargar, aplicar]);

  return {
    accs, setAccs, txs, setTxs, credits, setCredits, budgets, setBudgets, goals, setGoals,
    recurring, setRecurring, upcoming, setUpcoming, categories, setCategories, profile, setProfile, fx,
    booting, loadError, accsRef, txsRef, creditsRef, budgetsRef, goalsRef, recargar,
  };
}
