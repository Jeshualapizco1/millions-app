import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { inicioDeVentana } from "../lib/dates";
import { fusionarTxs, VENTANA_MESES } from "../lib/historial";
import { logError } from "../lib/errorLog";
import { listar as listarCola, soportaCola } from "../lib/offlineQueue";
import type { Account, Budget, Category, Credit, Goal, Profile, RecurringRule, Transaction, Upcoming } from "../types";
import type { FxRates } from "../lib/currency";

/**
 * Carga inicial + estado de accounts/txs/credits/budgets/goals, con refs
 * espejo para callbacks.
 *
 * El historial entra en dos tiempos (D9): primero los últimos `VENTANA_MESES`,
 * que es todo lo que el tablero necesita para estar completo y correcto, y en
 * cuanto eso está en pantalla se pide el resto. Quien solo abre la app a ver
 * cómo va el mes no espera por movimientos de hace tres años.
 *
 * `historialCompleto` dice si ya llegó todo. Lo que no puede trabajar con una
 * parte —exportar, el período "todo", cotejar duplicados al importar— lo mira
 * antes de dejar hacer, y los contadores usan `totalTxs`, que viene de un
 * `count` del servidor y no de lo que haya en memoria.
 */
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
  const [historialCompleto, setHistorialCompleto] = useState(false);
  const [totalTxs, setTotalTxs] = useState(0);

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

  /** true mientras la segunda carga viaja: evita pedirla dos veces. */
  const pidiendoTodo = useRef(false);
  const completoRef = useRef(false);
  useEffect(() => { completoRef.current = historialCompleto; }, [historialCompleto]);

  const cargar = useCallback((desde?: string) =>
    Promise.all([api.getCategories(), api.getAccounts(), api.getTxs(desde), api.getCredits(), api.getBudgets(), api.getGoals(), api.getRecurring(), api.getUpcoming(7), api.getProfile(), api.getFxRates(), api.contarTxs()]), []);

  /**
   * Mete en el estado una tanda de movimientos sin perder los que el servidor
   * no podía conocer. `idsPrevios` es la foto de lo que había ANTES de pedir:
   * lo que aparezca después es captura recién hecha y se protege.
   */
  const aplicarTxs = useCallback(async (llegaron: Transaction[], idsPrevios: ReadonlySet<string>) => {
    const enCola = soportaCola() ? await listarCola().then((c) => c.map((p) => p.id)).catch(() => []) : [];
    setTxs((enMemoria) => {
      const reciennacidos = enMemoria.filter((t) => !idsPrevios.has(t.id)).map((t) => t.id);
      return fusionarTxs(llegaron, enMemoria, new Set([...enCola, ...reciennacidos]));
    });
  }, []);

  const aplicar = useCallback(async ([cats, a, t, cr, b, g, rr, up, prof, rates, total]: Awaited<ReturnType<typeof cargar>>, todo: boolean, idsPrevios: ReadonlySet<string>) => {
    setProfile(prof);
    setFx(rates);
    setCategories(cats);
    setAccs(a);
    await aplicarTxs(t, idsPrevios);
    setTotalTxs(total);
    if (todo) setHistorialCompleto(true);
    setCredits(cr);
    setBudgets(b);
    setGoals(g);
    setRecurring(rr);
    setUpcoming(up);
  }, [aplicarTxs]);

  /**
   * El resto del historial, lo que quedó fuera de la ventana. Se pide solo en
   * cuanto el arranque terminó, y a mano desde lo que necesita el historial
   * entero antes de poder operar (exportar, importar, el período "todo").
   */
  const completarHistorial = useCallback(async () => {
    if (completoRef.current || pidiendoTodo.current) return;
    pidiendoTodo.current = true;
    const idsPrevios = new Set(txsRef.current.map((t) => t.id));
    try {
      await aplicarTxs(await api.getTxs(), idsPrevios);
      setHistorialCompleto(true);
    } catch (e) {
      // Que falle no rompe nada: el tablero ya está pintado con la ventana, y
      // lo que necesita todo seguirá viendo `historialCompleto` en false.
      logError(e, { action: "carga del historial completo" });
    } finally {
      pidiendoTodo.current = false;
    }
  }, [aplicarTxs]);

  /**
   * Recarga en segundo plano, al volver a la app. Si falla no se grita: los
   * datos en pantalla simplemente siguen siendo los de antes, que es mucho
   * mejor que un error encima de una app que funciona. Queda en el registro.
   */
  const recargar = useCallback(async () => {
    // Si el historial completo ya está cargado se vuelve a pedir entero: con
    // la ventana, todo lo anterior quedaría fuera de la respuesta y la fusión
    // lo daría por borrado.
    const desde = completoRef.current ? undefined : inicioDeVentana(VENTANA_MESES);
    const idsPrevios = new Set(txsRef.current.map((t) => t.id));
    try {
      await aplicar(await cargar(desde), !desde, idsPrevios);
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

    // El arranque pide solo la ventana: es lo que el tablero necesita para
    // estar completo, y lo demás no debe hacer esperar a nadie.
    const ventana = inicioDeVentana(VENTANA_MESES);
    const vacio: ReadonlySet<string> = new Set();

    cargar(ventana)
      .then((d) => aplicar(d, false, vacio))
      .catch(async (e) => {
        if (!esDesfaseDeReloj(e)) throw e;
        await new Promise((r) => setTimeout(r, 2500));
        return cargar(ventana).then((d) => aplicar(d, false, vacio));
      })
      .catch((e) => {
        console.error(e);
        logError(e, { action: "carga inicial de datos" });
        setLoadError(e?.message || "No se pudieron cargar tus datos");
      })
      .finally(() => {
        setBooting(false);
        // Ya hay algo en pantalla: ahora sí, el resto del historial.
        void completarHistorial();
      });
  }, [cargar, aplicar, completarHistorial]);

  return {
    accs, setAccs, txs, setTxs, credits, setCredits, budgets, setBudgets, goals, setGoals,
    recurring, setRecurring, upcoming, setUpcoming, categories, setCategories, profile, setProfile, fx,
    booting, loadError, accsRef, txsRef, creditsRef, budgetsRef, goalsRef, recargar,
    historialCompleto, totalTxs, completarHistorial,
  };
}
