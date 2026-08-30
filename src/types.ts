export type TxType = "gasto" | "ingreso";
export type CreditType = "tarjeta" | "hipoteca" | "auto" | "personal" | "otro";

export interface Account {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TxType;
  category: string;
  accountId: string | null;
  accountName: string;
  date: string;
}

export interface Credit {
  id: string;
  name: string;
  type: CreditType;
  institution: string | null;
  total_debt: number;
  credit_limit: number | null;
  monthly_payment: number | null;
  cut_day: number | null;
  payment_day: number | null;
  next_payment_date: string | null;
  interest_rate: number | null;
  icon?: string | null;
  color?: string | null;
  notes: string | null;
  created_at?: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  created_at?: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string;
  color: string;
  notes: string | null;
  created_at?: string;
}

/** Mensaje del historial que se envía a la IA (formato Anthropic). */
export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/** Mensaje mostrado en el chat de Análisis. */
export interface AiMsg {
  role: "user" | "assistant";
  text: string;
}

/** Las 19 acciones que expone la Netlify Function. */
export type ApiAction =
  | "chat"
  | "getAccounts"
  | "addAccount"
  | "updateAccount"
  | "updateBalance"
  | "getTxs"
  | "addTx"
  | "deleteTx"
  | "getCredits"
  | "addCredit"
  | "updateCredit"
  | "deleteCredit"
  | "getBudgets"
  | "upsertBudget"
  | "deleteBudget"
  | "getGoals"
  | "addGoal"
  | "updateGoal"
  | "deleteGoal";
