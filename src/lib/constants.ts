import type { CSSProperties } from "react";
import type { CreditType } from "../types";

export const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3e",
  accent: "#7c6af7",
  aLight: "#a89ff9",
  green: "#4ade80",
  red: "#f87171",
  text: "#e8e6ff",
  muted: "#6b6a8a",
  amber: "#fbbf24",
};

export const ACC_COLORS = ["#00b1ea", "#7c6af7", "#f472b6", "#fb923c", "#34d399", "#60a5fa", "#a78bfa", "#f59e0b"];
export const ACC_ICONS = ["🏦", "💳", "💵", "💰", "🏧", "📱", "🛒", "🌸", "💎", "🪙"];

export const CATS: Record<string, { icon: string; color: string }> = {
  "Alimentación": { icon: "🍔", color: "#f97316" },
  "Transporte": { icon: "🚗", color: "#3b82f6" },
  "Salud": { icon: "💊", color: "#ec4899" },
  "Educación": { icon: "📚", color: "#0ea5e9" },
  "Entretenimiento": { icon: "🎬", color: "#a855f7" },
  "Servicios": { icon: "💡", color: "#eab308" },
  "Compras": { icon: "🛍️", color: "#06b6d4" },
  "Nómina": { icon: "💼", color: "#10b981" },
  "Ventas": { icon: "🌸", color: "#4ade80" },
  "Transferencia": { icon: "↔️", color: "#8b5cf6" },
  "Otros": { icon: "📦", color: "#6b7280" },
};

export const CREDIT_TYPES: Record<CreditType, { icon: string; color: string; label: string }> = {
  tarjeta: { icon: "💳", color: "#f472b6", label: "Tarjeta" },
  hipoteca: { icon: "🏠", color: "#3b82f6", label: "Hipoteca" },
  auto: { icon: "🚗", color: "#f97316", label: "Auto" },
  personal: { icon: "💼", color: "#a855f7", label: "Personal" },
  otro: { icon: "📋", color: "#6b7280", label: "Otro" },
};

export const GOAL_ICONS = ["🎯", "🏠", "🚗", "✈️", "💍", "📱", "💻", "🎓", "🏖️", "💰", "🛡️", "🎸"];
export const GOAL_COLORS = ["#7c6af7", "#f472b6", "#f97316", "#3b82f6", "#10b981", "#eab308", "#ec4899", "#06b6d4"];

/** Estilos compartidos que en el monolito vivían como `s` dentro de App. */
export const S = {
  card: {
    background: C.card,
    border: `1px solid ${C.border}22`,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  } as CSSProperties,
  inp: {
    width: "100%",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    color: C.text,
    padding: "12px 16px",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  } as CSSProperties,
  btn: (bg: string = C.accent): CSSProperties => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  }),
  btnO: {
    background: "transparent",
    color: C.aLight,
    border: `1px solid ${C.accent}44`,
    borderRadius: 12,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  } as CSSProperties,
  lbl: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 6,
    display: "block",
    fontWeight: 500,
  } as CSSProperties,
};
