import type { Enums, Tables } from "./lib/database.types";

export type TxKind = Enums<"tx_kind">;
export type TxType = "gasto" | "ingreso";
export type CreditType = Enums<"credit_type">;

export interface Account {
  id: string;
  name: string;
  balance: number;
  /** Moneda de la cuenta. El total se consolida en MXN. */
  currency: string;
  icon: string;
  color: string;
  created_at?: string;
}

/** Forma que consume la UI: nombres resueltos por join, ya no desnormalizados. */
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  /** gasto | ingreso | transferencia | pago_credito | abono_meta */
  kind: TxKind;
  /** Signo para la UI: ingreso suma, todo lo demás resta de la cuenta origen. */
  type: TxType;
  category: string;
  categoryId: string | null;
  accountId: string;
  accountName: string;
  toAccountName: string | null;
  date: string;
}

export type Credit = Omit<Tables<"credits">, "user_id" | "updated_at" | "archived_at">;

export interface Budget {
  id: string;
  category: string;
  categoryId: string;
  amount: number;
  /** Arrastra al mes siguiente lo que no se gastó. */
  rollover: boolean;
}

export type Goal = Omit<Tables<"goals">, "user_id" | "updated_at">;

/** Preferencias del usuario. */
export interface Profile {
  id: string;
  name: string | null;
  base_currency: string;
  timezone: string;
  /** Techo de gasto mensual global, además de los límites por categoría. */
  monthly_budget: number | null;
  /** Cuándo aceptó el aviso y los términos. Null = nunca los ha aceptado. */
  legal_accepted_at: string | null;
  /** Versión aceptada. Si no coincide con LEGAL_VERSION, hay que volver a pedirla. */
  legal_version: string | null;
  /** Cuándo pidió borrar su cuenta. Null = no la ha pedido. */
  deletion_requested_at: string | null;
  /** Cuándo terminó (o saltó) el arranque guiado. Null = nunca lo ha visto. */
  onboarded_at: string | null;
  /** Alta de la cuenta: base del contador de los 60 días de promoción. */
  created_at: string;
}

export type CategoryKind = Enums<"category_kind">;

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  hidden: boolean;
  sort_order: number;
}

export type RecurringFrequency = Enums<"recurring_frequency">;

/** Regla de movimiento fijo: el servidor genera la transacción cada período. */
export interface RecurringRule {
  id: string;
  name: string;
  kind: TxType;
  amount: number;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  category: string;
  frequency: RecurringFrequency;
  next_run: string;
  last_run: string | null;
  active: boolean;
}

/** Una ocurrencia futura, ya proyectada por el servidor. */
export interface Upcoming {
  ruleId: string;
  name: string;
  kind: TxType;
  amount: number;
  accountId: string;
  due: string;
}

/** Mensaje del historial que se envía a la IA (formato Anthropic). */
export interface ChatMsg {
  role: "user" | "assistant";
  /** Texto, o los bloques crudos cuando hay una herramienta de por medio. */
  content: string | unknown[];
}

/** Acción que el asesor propone y que la persona debe confirmar. */
export interface ProposedAction {
  toolUseId: string;
  name: string;
  input: Record<string, any>;
}

/** Mensaje mostrado en el chat de Análisis. */
export interface AiMsg {
  role: "user" | "assistant";
  text: string;
  /** Cuando viene, el mensaje trae una tarjeta de confirmación. */
  action?: ProposedAction;
  /** Se marca al confirmar o descartar para que la tarjeta deje de ser accionable. */
  resolved?: "hecho" | "descartado";
}
