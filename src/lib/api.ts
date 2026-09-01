// ============================================================================
// Capa de datos v2: el cliente habla directo con Supabase (RLS autoriza) y
// cada movimiento de dinero pasa por una RPC atómica. La Netlify Function
// queda solo para la IA. El proxy de 19 acciones desapareció.
// ============================================================================
import type { Tables } from "./database.types";
import type { AiUso } from "./aiUso";
import { sbClient } from "./supabase";
import type { FxRates } from "./currency";
import type { Account, Budget, Category, CategoryKind, ChatMsg, Profile, Credit, Goal, ProposedAction, RecurringFrequency, RecurringRule, Transaction, TxKind, TxType, Upcoming } from "../types";
import type { Respuestas } from "./onboarding";

const fail = (error: { message: string } | null): never => {
  throw new Error(error?.message || "Error de servidor");
};

const uid = async (): Promise<string> => {
  const { data } = await sbClient.auth.getSession();
  let id = data.session?.user.id;
  if (!id) {
    // Un intento de refresh antes de rendirse (PWA que despierta tras horas dormida)
    const { data: r } = await sbClient.auth.refreshSession();
    id = r.session?.user.id;
  }
  if (!id) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return id;
};

// ── Categorías (cache de sesión: nombre ⇄ id) ───────────────────────────────
let catCache: Category[] | null = null;

/** Trae también las ocultas: la pantalla de gestión las necesita. */
const loadCategories = async (): Promise<Category[]> => {
  const { data, error } = await sbClient
    .from("categories")
    .select("id,name,icon,color,kind,hidden,sort_order")
    .order("sort_order");
  if (error) fail(error);
  catCache = data!;
  return catCache;
};

const categoryId = async (name: string | null | undefined): Promise<string | null> => {
  if (!name) return null;
  const cats = catCache ?? (await loadCategories());
  return cats.find((c) => c.name === name)?.id ?? cats.find((c) => c.name === "Otros")?.id ?? null;
};

// ── Normalización de transacciones (joins → forma de la UI) ─────────────────
type RawTx = Tables<"transactions"> & {
  account: { name: string } | null;
  to_account: { name: string } | null;
  category: { name: string } | null;
};

const TX_SELECT =
  "*, account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name), category:categories(name)";

const normTx = (r: RawTx): Transaction => ({
  id: r.id,
  description: r.description,
  amount: Number(r.amount),
  kind: r.kind,
  type: r.kind === "ingreso" ? "ingreso" : "gasto",
  category: r.category?.name ?? "Otros",
  categoryId: r.category_id,
  accountId: r.account_id,
  accountName: r.account?.name ?? "",
  toAccountName: r.to_account?.name ?? null,
  toAccountId: r.to_account_id,
  creditId: r.credit_id,
  goalId: r.goal_id,
  date: r.date,
});

/** Tras una RPC (sin joins), resuelve nombres con los datos ya cargados. */
const normTxLocal = (r: Tables<"transactions">, accs: Account[], cats: Category[]): Transaction => ({
  id: r.id,
  description: r.description,
  amount: Number(r.amount),
  kind: r.kind,
  type: r.kind === "ingreso" ? "ingreso" : "gasto",
  category: cats.find((c) => c.id === r.category_id)?.name ?? "Otros",
  categoryId: r.category_id,
  accountId: r.account_id,
  accountName: accs.find((a) => a.id === r.account_id)?.name ?? "",
  toAccountName: accs.find((a) => a.id === r.to_account_id)?.name ?? null,
  toAccountId: r.to_account_id,
  creditId: r.credit_id,
  goalId: r.goal_id,
  date: r.date,
});

// ── IA (única responsabilidad de la Netlify Function) ───────────────────────
export interface AiReply {
  text: string;
  action?: ProposedAction;
  /** Turno completo del asistente, para continuar la conversación tras confirmar. */
  raw?: unknown[];
  /** Consumo del día, ya contando esta llamada. */
  uso?: AiUso;
}

const aiToken = async (): Promise<string> => {
  const { data } = await sbClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión expirada");
  return token;
};

const aiCall = async (intent: "capture" | "advise", messages: ChatMsg[]): Promise<AiReply> => {
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await aiToken()}` },
    body: JSON.stringify({ intent, messages }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body as AiReply;
};

/** Consumo del día sin gastar una llamada: el mismo endpoint, por GET. */
const aiUsage = async (): Promise<AiUso> => {
  const res = await fetch("/.netlify/functions/chat", { headers: { Authorization: `Bearer ${await aiToken()}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.uso) throw new Error(body.error || `Error ${res.status}`);
  return body.uso as AiUso;
};

export const api = {
  // ── Categorías ────────────────────────────────────────────────────────────
  getCategories: loadCategories,
  async upsertCategory(p: { id?: string; name: string; icon: string; color: string; kind: CategoryKind }): Promise<void> {
    const row = { name: p.name, icon: p.icon, color: p.color, kind: p.kind };
    const { error } = p.id
      ? await sbClient.from("categories").update(row).eq("id", p.id)
      : await sbClient.from("categories").insert({ ...row, user_id: await uid(), sort_order: 99 });
    if (error) fail(error);
    catCache = null;
  },
  /** No se borran: los movimientos que las usan perderían su etiqueta. */
  async setCategoryHidden(id: string, hidden: boolean): Promise<void> {
    const { error } = await sbClient.from("categories").update({ hidden }).eq("id", id);
    if (error) fail(error);
    catCache = null;
  },

  // ── Cuentas ───────────────────────────────────────────────────────────────
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await sbClient
      .from("accounts")
      .select("id,name,balance,currency,icon,color,created_at")
      .is("archived_at", null)
      .order("created_at");
    if (error) fail(error);
    return data!.map((a) => ({ ...a, balance: Number(a.balance) }));
  },
  async addAccount(p: { name: string; balance: number; icon: string; color: string; currency?: string }): Promise<Account> {
    const { data, error } = await sbClient
      .from("accounts")
      .insert({ ...p, user_id: await uid() })
      .select("id,name,balance,currency,icon,color,created_at")
      .single();
    if (error) fail(error);
    return { ...data!, balance: Number(data!.balance) };
  },
  async updateAccount(p: { id: string; name: string; balance: number; icon: string; color: string; currency?: string }): Promise<void> {
    const { id, ...rest } = p;
    const { error } = await sbClient.from("accounts").update(rest).eq("id", id);
    if (error) fail(error);
  },
  /** ¿Cuántos movimientos tocan esta cuenta? Decide entre archivar y eliminar. */
  async countAccountTxs(id: string): Promise<number> {
    const { count, error } = await sbClient
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .or(`account_id.eq.${id},to_account_id.eq.${id}`);
    if (error) fail(error);
    return count ?? 0;
  },
  /** Sale del total y de los selectores, pero su historial se conserva. */
  async archiveAccount(id: string): Promise<void> {
    const { error } = await sbClient.from("accounts").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) fail(error);
  },
  /** Solo para cuentas sin movimientos: la FK impide borrar si tiene historial. */
  async deleteAccount(id: string): Promise<void> {
    const { error } = await sbClient.from("accounts").delete().eq("id", id);
    if (error) fail(error);
  },

  // ── Transacciones (siempre vía RPC atómica) ───────────────────────────────
  /**
   * Todo el historial, en páginas.
   *
   * PostgREST corta la respuesta en su tope de filas (1000 por omisión en
   * Supabase) SIN avisar: con un historial largo, la app se quedaba con un
   * pedazo y los totales, la dona y la gráfica de 6 meses salían mal sin que
   * nada fallara. Se pide por rangos hasta que una página venga incompleta.
   *
   * Sigue trayendo todo: los períodos, el patrimonio y las gráficas necesitan
   * el historial completo. Cargar solo lo reciente exige mover esos cálculos
   * al servidor, y eso es trabajo aparte.
   */
  async getTxs(): Promise<Transaction[]> {
    const PAGINA = 1000;
    const todas: RawTx[] = [];
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error } = await sbClient
        .from("transactions")
        .select(TX_SELECT)
        .order("date", { ascending: false })
        .order("id", { ascending: false }) // desempate estable entre páginas
        .range(desde, desde + PAGINA - 1);
      if (error) fail(error);
      const filas = (data ?? []) as unknown as RawTx[];
      todas.push(...filas);
      if (filas.length < PAGINA) break;
    }
    return todas.map(normTx);
  },
  async applyTx(p: {
    accountId: string;
    kind: TxKind;
    amount: number;
    description: string;
    category?: string | null;
    date?: string;
    /** Id decidido por el cliente: hace idempotente el reintento de la cola. */
    clientId?: string;
  }, accs: Account[]): Promise<Transaction> {
    const { data, error } = await sbClient.rpc("apply_transaction", {
      p_account_id: p.accountId,
      p_kind: p.kind,
      p_amount: p.amount,
      p_description: p.description,
      p_category_id: (await categoryId(p.category)) ?? undefined,
      p_date: p.date,
      p_client_id: p.clientId,
    });
    if (error) fail(error);
    return normTxLocal(data!, accs, catCache ?? []);
  },
  async deleteTx(id: string): Promise<void> {
    const { error } = await sbClient.rpc("reverse_transaction", { p_id: id });
    if (error) fail(error);
  },
  /** Editar: la RPC revierte el efecto viejo y aplica el nuevo en una sola transacción. */
  async updateTx(p: {
    id: string;
    accountId: string;
    kind: TxKind;
    amount: number;
    description: string;
    category?: string | null;
    date?: string;
  }, accs: Account[]): Promise<Transaction> {
    const { data, error } = await sbClient.rpc("update_transaction", {
      p_id: p.id,
      p_account_id: p.accountId,
      p_kind: p.kind,
      p_amount: p.amount,
      p_description: p.description,
      p_category_id: (await categoryId(p.category)) ?? undefined,
      p_date: p.date,
    });
    if (error) fail(error);
    return normTxLocal(data!, accs, catCache ?? []);
  },
  async transfer(p: { fromId: string; toId: string; amount: number; description?: string }, accs: Account[]): Promise<Transaction> {
    const { data, error } = await sbClient.rpc("transfer", {
      p_from_account: p.fromId,
      p_to_account: p.toId,
      p_amount: p.amount,
      p_description: p.description,
    });
    if (error) fail(error);
    return normTxLocal(data!, accs, catCache ?? []);
  },

  /** Importación masiva: una sola transacción de Postgres, todo o nada. */
  async importTxs(rows: { id?: string; accountId: string; kind: TxType; amount: number; description: string; date: string; category?: string | null }[]): Promise<number> {
    const payload = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        account_id: r.accountId,
        kind: r.kind,
        amount: r.amount,
        description: r.description,
        date: r.date,
        category_id: (await categoryId(r.category)) ?? "",
      }))
    );
    const { data, error } = await sbClient.rpc("import_transactions", { p_rows: payload });
    if (error) fail(error);
    return Number(data ?? 0);
  },

  // ── Créditos ──────────────────────────────────────────────────────────────
  async getCredits(): Promise<Credit[]> {
    const { data, error } = await sbClient
      .from("credits")
      .select("id,name,type,institution,total_debt,credit_limit,monthly_payment,cut_day,payment_day,next_payment_date,interest_rate,notes,created_at")
      .is("archived_at", null)
      .order("created_at");
    if (error) fail(error);
    return data!.map((c) => ({ ...c, total_debt: Number(c.total_debt) }));
  },
  async addCredit(p: Omit<Credit, "id" | "created_at">): Promise<Credit> {
    const { data, error } = await sbClient
      .from("credits")
      .insert({ ...p, user_id: await uid() })
      .select("id,name,type,institution,total_debt,credit_limit,monthly_payment,cut_day,payment_day,next_payment_date,interest_rate,notes,created_at")
      .single();
    if (error) fail(error);
    return { ...data!, total_debt: Number(data!.total_debt) };
  },
  async updateCredit(p: { id: string } & Omit<Credit, "id" | "created_at">): Promise<void> {
    const { id, ...rest } = p;
    const { error } = await sbClient.from("credits").update(rest).eq("id", id);
    if (error) fail(error);
  },
  async deleteCredit(id: string): Promise<void> {
    const { error } = await sbClient.from("credits").delete().eq("id", id);
    if (error) fail(error);
  },
  async payCredit(p: { creditId: string; accountId: string; amount: number }, accs: Account[]): Promise<Transaction> {
    const { data, error } = await sbClient.rpc("pay_credit", {
      p_credit_id: p.creditId,
      p_account_id: p.accountId,
      p_amount: p.amount,
    });
    if (error) fail(error);
    return normTxLocal(data!, accs, catCache ?? []);
  },

  // ── Tipos de cambio ───────────────────────────────────────────────────────
  /** MXN → X. Un job diario las actualiza desde el BCE. */
  async getFxRates(): Promise<FxRates> {
    const { data, error } = await sbClient.from("fx_rates").select("quote,rate").eq("base", "MXN");
    if (error) fail(error);
    return Object.fromEntries((data ?? []).map((r) => [r.quote, Number(r.rate)]));
  },

  // ── Perfil ────────────────────────────────────────────────────────────────
  async getProfile(): Promise<Profile> {
    const { data, error } = await sbClient
      .from("profiles")
      .select("id,name,base_currency,timezone,monthly_budget,legal_accepted_at,legal_version,deletion_requested_at,onboarded_at,created_at")
      .single();
    if (error) fail(error);
    return { ...data!, monthly_budget: data!.monthly_budget === null ? null : Number(data!.monthly_budget) };
  },
  /** Marca el arranque guiado como terminado. La fecha la pone Postgres. */
  async completeOnboarding(): Promise<string> {
    const { data, error } = await sbClient.rpc("complete_onboarding");
    if (error) fail(error);
    return data as string;
  },
  async setMonthlyBudget(amount: number | null): Promise<void> {
    const { error } = await sbClient.from("profiles").update({ monthly_budget: amount }).eq("id", await uid());
    if (error) fail(error);
  },

  // ── Presupuestos (por category_id; la UI sigue hablando nombres) ──────────
  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await sbClient
      .from("budgets")
      .select("id,amount,rollover,category_id,category:categories(name)")
      .eq("period", "mensual")
      .order("created_at");
    if (error) fail(error);
    return data!.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      rollover: b.rollover,
      categoryId: b.category_id,
      category: (b.category as unknown as { name: string } | null)?.name ?? "Otros",
    }));
  },
  async upsertBudget(p: { category: string; amount: number; rollover?: boolean }): Promise<Budget> {
    const catId = await categoryId(p.category);
    if (!catId) throw new Error(`Categoría desconocida: ${p.category}`);
    const userId = await uid();
    // Sin `rollover` explícito se conserva el que ya tenía: el asesor solo
    // manda categoría y monto, y antes eso apagaba el arrastre en silencio.
    let rollover = p.rollover;
    if (rollover === undefined) {
      const { data: prev } = await sbClient.from("budgets").select("rollover").eq("user_id", userId).eq("category_id", catId).eq("period", "mensual").maybeSingle();
      rollover = prev?.rollover ?? false;
    }
    const { data, error } = await sbClient
      .from("budgets")
      .upsert(
        { user_id: userId, category_id: catId, period: "mensual", amount: p.amount, rollover },
        { onConflict: "user_id,category_id,period" }
      )
      .select("id,amount,rollover,category_id")
      .single();
    if (error) fail(error);
    return { id: data!.id, amount: Number(data!.amount), rollover: data!.rollover, categoryId: data!.category_id, category: p.category };
  },
  async deleteBudget(id: string): Promise<void> {
    const { error } = await sbClient.from("budgets").delete().eq("id", id);
    if (error) fail(error);
  },

  // ── Metas ─────────────────────────────────────────────────────────────────
  async getGoals(): Promise<Goal[]> {
    const { data, error } = await sbClient.from("goals").select().order("created_at");
    if (error) fail(error);
    return data!.map((g) => ({ ...g, target_amount: Number(g.target_amount), current_amount: Number(g.current_amount) }));
  },
  async addGoal(p: { name: string; target_amount: number; current_amount: number; target_date: string | null; icon: string; color: string; notes: string | null }): Promise<Goal> {
    const { data, error } = await sbClient
      .from("goals")
      .insert({ ...p, user_id: await uid() })
      .select()
      .single();
    if (error) fail(error);
    return { ...data!, target_amount: Number(data!.target_amount), current_amount: Number(data!.current_amount) };
  },
  async updateGoal(p: { id: string } & Partial<Omit<Goal, "id" | "created_at">>): Promise<void> {
    const { id, ...rest } = p;
    const { error } = await sbClient.from("goals").update(rest).eq("id", id);
    if (error) fail(error);
  },
  async deleteGoal(id: string): Promise<void> {
    const { error } = await sbClient.from("goals").delete().eq("id", id);
    if (error) fail(error);
  },
  /** Abono atómico. Sin accountId es solo registro (ahorro externo). */
  async contributeGoal(p: { goalId: string; amount: number; accountId?: string | null }): Promise<Goal> {
    const { data, error } = await sbClient.rpc("contribute_goal", {
      p_goal_id: p.goalId,
      p_amount: p.amount,
      p_account_id: p.accountId ?? undefined,
    });
    if (error) fail(error);
    return { ...data!, target_amount: Number(data!.target_amount), current_amount: Number(data!.current_amount) };
  },

  // ── Recurrentes ───────────────────────────────────────────────────────────
  async getRecurring(): Promise<RecurringRule[]> {
    const { data, error } = await sbClient
      .from("recurring_rules")
      .select("*, account:accounts(name), category:categories(name)")
      .order("next_run");
    if (error) fail(error);
    return (data as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind as TxType,
      amount: Number(r.amount),
      accountId: r.account_id,
      accountName: r.account?.name ?? "",
      categoryId: r.category_id,
      category: r.category?.name ?? "Otros",
      frequency: r.frequency,
      next_run: r.next_run,
      last_run: r.last_run,
      active: r.active,
    }));
  },
  async upsertRecurring(p: {
    id?: string;
    name: string;
    kind: TxType;
    amount: number;
    accountId: string;
    category: string;
    frequency: RecurringFrequency;
    next_run: string;
  }): Promise<void> {
    const row = {
      name: p.name,
      kind: p.kind,
      amount: p.amount,
      account_id: p.accountId,
      category_id: await categoryId(p.category),
      frequency: p.frequency,
      next_run: p.next_run,
    };
    const { error } = p.id
      ? await sbClient.from("recurring_rules").update(row).eq("id", p.id)
      : await sbClient.from("recurring_rules").insert({ ...row, user_id: await uid() });
    if (error) fail(error);
  },
  async setRecurringActive(id: string, active: boolean): Promise<void> {
    const { error } = await sbClient.from("recurring_rules").update({ active }).eq("id", id);
    if (error) fail(error);
  },
  async deleteRecurring(id: string): Promise<void> {
    const { error } = await sbClient.from("recurring_rules").delete().eq("id", id);
    if (error) fail(error);
  },
  /** Ocurrencias proyectadas por el servidor para los próximos N días. */
  async getUpcoming(days = 7): Promise<Upcoming[]> {
    const { data, error } = await sbClient.rpc("upcoming_recurring", { p_days: days });
    if (error) fail(error);
    return (data ?? []).map((u: any) => ({
      ruleId: u.rule_id,
      name: u.name,
      kind: u.kind as TxType,
      amount: Number(u.amount),
      accountId: u.account_id,
      due: u.due,
    }));
  },

  // ── IA ────────────────────────────────────────────────────────────────────
  aiCapture: (messages: ChatMsg[]) => aiCall("capture", messages),
  aiAdvise: (messages: ChatMsg[]) => aiCall("advise", messages),
  aiUsage,

  // ── Cuenta de usuario ─────────────────────────────────────────────────────
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await sbClient.auth.updateUser({ password: newPassword });
    if (error) fail(error);
  },

  /** Deja constancia de que aceptó el aviso y los términos. La fecha la pone Postgres. */
  async acceptLegal(version: string): Promise<string> {
    const { data, error } = await sbClient.rpc("accept_legal", { p_version: version });
    if (error) fail(error);
    return data as string;
  },

  /** Pide la baja. No borra nada todavía: el cron purga a los 30 días. */
  async requestAccountDeletion(): Promise<string> {
    const { data, error } = await sbClient.rpc("request_account_deletion");
    if (error) fail(error);
    return data as string;
  },

  async cancelAccountDeletion(): Promise<void> {
    const { error } = await sbClient.rpc("cancel_account_deletion");
    if (error) fail(error);
  },

  /**
   * Guarda lo que la persona contestó en la primera mitad del arranque.
   *
   * No marca el perfil: eso es `completeOnboarding`, y son momentos distintos
   * —entre uno y otro falta que vea su pantalla de cierre y decida si
   * configura sus cuentas—.
   *
   * `completed: false` es quien tocó "Ahora no": queda constancia de que ya lo
   * vio, pero sus respuestas vacías no deben contar en las estadísticas.
   */
  /**
   * ¿Ya contestó (o saltó) las preguntas del arranque? Sirve para retomar en
   * la parte de configurar si cerró la app en la pantalla de cierre, en vez
   * de volver a hacerle las cinco preguntas.
   */
  async surveyDone(): Promise<boolean> {
    const { data, error } = await sbClient.from("user_survey").select("completed").eq("user_id", await uid()).maybeSingle();
    if (error) fail(error);
    return !!data;
  },

  async saveOnboarding(r: Respuestas, completed = true): Promise<string> {
    const { data, error } = await sbClient.rpc("save_onboarding", {
      p_goal: r.goal ?? undefined,
      p_pains: r.pains,
      p_current_tool: r.current_tool ?? undefined,
      p_dream: r.dream.trim() || undefined,
      p_source: r.source ?? undefined,
      p_completed: completed,
    });
    if (error) fail(error);
    return data as string;
  },
};
