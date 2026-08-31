export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived_at: string | null
          balance: number
          color: string
          created_at: string
          currency: string
          icon: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          balance?: number
          color?: string
          created_at?: string
          currency?: string
          icon?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          balance?: number
          color?: string
          created_at?: string
          currency?: string
          icon?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          id: number
          intent: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          intent: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          intent?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          context: Json
          created_at: string
          id: number
          message: string
          stack: string | null
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: never
          message: string
          stack?: string | null
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: never
          message?: string
          stack?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          period: Database["public"]["Enums"]["budget_period"]
          rollover: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          rollover?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          rollover?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          hidden: boolean
          icon: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          hidden?: boolean
          icon?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          hidden?: boolean
          icon?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_payments: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          credit_id: string
          id: string
          paid_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          credit_id: string
          id?: string
          paid_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          credit_id?: string
          id?: string
          paid_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          archived_at: string | null
          created_at: string
          credit_limit: number | null
          cut_day: number | null
          id: string
          institution: string | null
          interest_rate: number | null
          monthly_payment: number | null
          name: string
          next_payment_date: string | null
          notes: string | null
          payment_day: number | null
          total_debt: number
          type: Database["public"]["Enums"]["credit_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          credit_limit?: number | null
          cut_day?: number | null
          id?: string
          institution?: string | null
          interest_rate?: number | null
          monthly_payment?: number | null
          name: string
          next_payment_date?: string | null
          notes?: string | null
          payment_day?: number | null
          total_debt?: number
          type: Database["public"]["Enums"]["credit_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          credit_limit?: number | null
          cut_day?: number | null
          id?: string
          institution?: string | null
          interest_rate?: number | null
          monthly_payment?: number | null
          name?: string
          next_payment_date?: string | null
          notes?: string | null
          payment_day?: number | null
          total_debt?: number
          type?: Database["public"]["Enums"]["credit_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          as_of: string
          base: string
          quote: string
          rate: number
          updated_at: string
        }
        Insert: {
          as_of: string
          base: string
          quote: string
          rate: number
          updated_at?: string
        }
        Update: {
          as_of?: string
          base?: string
          quote?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          account_id: string | null
          amount: number
          contributed_at: string
          created_at: string
          goal_id: string
          id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          contributed_at?: string
          created_at?: string
          goal_id: string
          id?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          contributed_at?: string
          created_at?: string
          goal_id?: string
          id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string | null
          color: string
          completed_at: string | null
          created_at: string
          current_amount: number
          icon: string
          id: string
          name: string
          notes: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          color?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name: string
          notes?: string | null
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          color?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name?: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          monthly_budget: number | null
          name: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id: string
          monthly_budget?: number | null
          name?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          last_run: string | null
          name: string
          next_run: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          kind: Database["public"]["Enums"]["tx_kind"]
          last_run?: string | null
          name: string
          next_run: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          last_run?: string | null
          name?: string
          next_run?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          credit_id: string | null
          date: string
          description: string
          goal_id: string | null
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          notes: string | null
          receipt_path: string | null
          recurring_id: string | null
          to_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          credit_id?: string | null
          date?: string
          description: string
          goal_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["tx_kind"]
          notes?: string | null
          receipt_path?: string | null
          recurring_id?: string | null
          to_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_id?: string | null
          date?: string
          description?: string
          goal_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          notes?: string | null
          receipt_path?: string | null
          recurring_id?: string | null
          to_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id?: string
          p_client_id?: string
          p_date?: string
          p_description: string
          p_kind: Database["public"]["Enums"]["tx_kind"]
          p_notes?: string
          p_recurring_id?: string
        }
        Returns: Database["public"]["Tables"]["transactions"]["Row"]
      }
      contribute_goal: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_date?: string
          p_goal_id: string
        }
        Returns: Database["public"]["Tables"]["goals"]["Row"]
      }
      pay_credit: {
        Args: {
          p_account_id: string
          p_amount: number
          p_credit_id: string
          p_date?: string
        }
        Returns: Database["public"]["Tables"]["transactions"]["Row"]
      }
      reverse_transaction: { Args: { p_id: string }; Returns: undefined }
      import_transactions: { Args: { p_rows: Json }; Returns: number }
      advance_date: {
        Args: {
          p_date: string
          p_freq: Database["public"]["Enums"]["recurring_frequency"]
        }
        Returns: string
      }
      upcoming_recurring: {
        Args: { p_days?: number }
        Returns: {
          rule_id: string
          name: string
          kind: Database["public"]["Enums"]["tx_kind"]
          amount: number
          account_id: string
          due: string
        }[]
      }
      transfer: {
        Args: {
          p_amount: number
          p_date?: string
          p_description?: string
          p_from_account: string
          p_to_account: string
        }
        Returns: Database["public"]["Tables"]["transactions"]["Row"]
      }
      tx_delta: {
        Args: {
          p_amount: number
          p_kind: Database["public"]["Enums"]["tx_kind"]
        }
        Returns: number
      }
      update_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id?: string
          p_date?: string
          p_description: string
          p_id: string
          p_kind: Database["public"]["Enums"]["tx_kind"]
          p_notes?: string
        }
        Returns: Database["public"]["Tables"]["transactions"]["Row"]
      }
    }
    Enums: {
      budget_period: "semanal" | "mensual" | "anual"
      category_kind: "gasto" | "ingreso" | "ambos"
      credit_type: "tarjeta" | "hipoteca" | "auto" | "personal" | "otro"
      recurring_frequency: "semanal" | "quincenal" | "mensual" | "anual"
      tx_kind:
        | "gasto"
        | "ingreso"
        | "transferencia"
        | "pago_credito"
        | "abono_meta"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      budget_period: ["semanal", "mensual", "anual"],
      category_kind: ["gasto", "ingreso", "ambos"],
      credit_type: ["tarjeta", "hipoteca", "auto", "personal", "otro"],
      recurring_frequency: ["semanal", "quincenal", "mensual", "anual"],
      tx_kind: [
        "gasto",
        "ingreso",
        "transferencia",
        "pago_credito",
        "abono_meta",
      ],
    },
  },
} as const
