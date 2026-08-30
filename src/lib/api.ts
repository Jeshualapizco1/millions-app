import type { Account, ApiAction, Budget, Credit, Goal, Transaction, TxType } from "../types";

// ── Filas crudas de Supabase (NUMERIC llega como string, FKs en snake_case) ──
interface RawAccount {
  id: string;
  name: string;
  balance: string | number;
  icon: string;
  color: string;
  created_at?: string;
}
interface RawTx {
  id: string;
  description: string;
  amount: string | number;
  type: TxType;
  category: string;
  account_id: string | null;
  account_name: string;
  date: string;
}
interface RawCredit {
  id: string;
  name: string;
  type: Credit["type"];
  institution: string | null;
  total_debt: string | number | null;
  credit_limit: string | number | null;
  monthly_payment: string | number | null;
  cut_day: number | null;
  payment_day: number | null;
  next_payment_date: string | null;
  interest_rate: string | number | null;
  icon?: string | null;
  color?: string | null;
  notes: string | null;
  created_at?: string;
}
interface RawBudget {
  id: string;
  category: string;
  amount: string | number;
  created_at?: string;
}
interface RawGoal {
  id: string;
  name: string;
  target_amount: string | number;
  current_amount: string | number;
  target_date: string | null;
  icon: string;
  color: string;
  notes: string | null;
  created_at?: string;
}

// ── Payloads de escritura (van a la function tal como los espera Supabase) ──
export interface TxInsert {
  description: string;
  amount: number;
  type: TxType;
  category: string;
  account_id: string | null;
  account_name: string;
  date: string;
}
export type AccountInsert = { name: string; balance: number; icon: string; color: string };
export type CreditUpsert = Omit<Credit, "id" | "created_at" | "icon" | "color">;
export type GoalUpsert = Omit<Goal, "id" | "created_at">;

// ── Normalización: se hace UNA sola vez aquí, el resto de la app usa number/camelCase ──
const num = (v: string | number | null | undefined) => Number(v) || 0;
const numOrNull = (v: string | number | null | undefined) => (v === null || v === undefined ? null : Number(v));

const normAccount = (r: RawAccount): Account => ({ ...r, balance: num(r.balance) });
const normTx = (r: RawTx): Transaction => ({
  id: r.id,
  description: r.description,
  amount: num(r.amount),
  type: r.type,
  category: r.category,
  accountId: r.account_id,
  accountName: r.account_name,
  date: r.date,
});
const normCredit = (r: RawCredit): Credit => ({
  ...r,
  total_debt: num(r.total_debt),
  credit_limit: numOrNull(r.credit_limit),
  monthly_payment: numOrNull(r.monthly_payment),
  interest_rate: numOrNull(r.interest_rate),
});
const normBudget = (r: RawBudget): Budget => ({ ...r, amount: num(r.amount) });
const normGoal = (r: RawGoal): Goal => ({
  ...r,
  target_amount: num(r.target_amount),
  current_amount: num(r.current_amount),
});

const call = async (action: ApiAction, payload?: unknown, token?: string): Promise<any> => {
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload, token }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
};

export const api = {
  chat: (payload: unknown, token: string): Promise<any> => call("chat", payload, token),

  getAccounts: async (token: string): Promise<Account[]> =>
    (((await call("getAccounts", undefined, token)) as RawAccount[]) || []).map(normAccount),
  addAccount: async (payload: AccountInsert, token: string): Promise<Account[]> =>
    (((await call("addAccount", payload, token)) as RawAccount[]) || []).map(normAccount),
  updateAccount: (payload: { id: string } & AccountInsert, token: string) =>
    call("updateAccount", payload, token),
  updateBalance: (payload: { id: string; delta?: number; balance?: number }, token: string) =>
    call("updateBalance", payload, token),

  getTxs: async (token: string): Promise<Transaction[]> =>
    (((await call("getTxs", undefined, token)) as RawTx[]) || []).map(normTx),
  addTx: async (payload: TxInsert, token: string): Promise<Transaction[]> =>
    (((await call("addTx", payload, token)) as RawTx[]) || []).map(normTx),
  deleteTx: (payload: { id: string }, token: string) => call("deleteTx", payload, token),

  getCredits: async (token: string): Promise<Credit[]> =>
    (((await call("getCredits", undefined, token)) as RawCredit[]) || []).map(normCredit),
  addCredit: async (payload: CreditUpsert, token: string): Promise<Credit[]> =>
    (((await call("addCredit", payload, token)) as RawCredit[]) || []).map(normCredit),
  updateCredit: (payload: { id: string } & CreditUpsert, token: string) =>
    call("updateCredit", payload, token),
  deleteCredit: (payload: { id: string }, token: string) => call("deleteCredit", payload, token),

  getBudgets: async (token: string): Promise<Budget[]> =>
    (((await call("getBudgets", undefined, token)) as RawBudget[]) || []).map(normBudget),
  upsertBudget: async (payload: { category: string; amount: number }, token: string): Promise<Budget[]> =>
    (((await call("upsertBudget", payload, token)) as RawBudget[]) || []).map(normBudget),
  deleteBudget: (payload: { id: string }, token: string) => call("deleteBudget", payload, token),

  getGoals: async (token: string): Promise<Goal[]> =>
    (((await call("getGoals", undefined, token)) as RawGoal[]) || []).map(normGoal),
  addGoal: async (payload: GoalUpsert, token: string): Promise<Goal[]> =>
    (((await call("addGoal", payload, token)) as RawGoal[]) || []).map(normGoal),
  updateGoal: (payload: { id: string } & Partial<GoalUpsert>, token: string) =>
    call("updateGoal", payload, token),
  deleteGoal: (payload: { id: string }, token: string) => call("deleteGoal", payload, token),
};
