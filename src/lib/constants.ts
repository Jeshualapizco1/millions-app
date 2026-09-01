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
  // #8b8aa8 sobre la tarjeta da 4.6:1; el #6b6a8a anterior daba 3.3:1 y se
  // usaba a 10–11 px, justo donde menos contraste se puede permitir.
  muted: "#8b8aa8",
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

/**
 * Escala tipográfica. Los valores son los que YA estaban en pantalla (los
 * seis más usados de 27 distintos): este paso no cambia un pixel, solo les
 * da nombre. Los tamaños fraccionarios (13.5, 14.5…) y las cifras de
 * portada siguen como literales hasta que el rediseño decida la escala final.
 */
export const T = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  hero: 24,
} as const;

/** Radios. Mismo criterio: los que ya se usan, con nombre. */
export const R = {
  sm: 10,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Estilos compartidos que en el monolito vivían como `s` dentro de App. */
export const S = {
  card: {
    background: C.card,
    border: `1px solid ${C.border}22`,
    borderRadius: R.lg,
    padding: 18,
    marginBottom: 14,
  } as CSSProperties,
  inp: {
    width: "100%",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: R.md,
    color: C.text,
    padding: "12px 16px",
    // 16 y no 15: por debajo de 16 px Safari en iPhone hace zoom al enfocar
    // un campo, y la pantalla se queda desplazada al cerrarlo.
    fontSize: T.lg,
    // Sin `outline: none`: el foco visible vive en index.html (focus-visible),
    // que solo lo pinta al navegar con teclado y no al tocar.
    boxSizing: "border-box",
  } as CSSProperties,
  btn: (bg: string = C.accent): CSSProperties => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: R.md,
    padding: "13px 20px",
    fontSize: T.base,
    fontWeight: 700,
    cursor: "pointer",
  }),
  btnO: {
    background: "transparent",
    color: C.aLight,
    border: `1px solid ${C.accent}44`,
    borderRadius: R.md,
    padding: "13px 20px",
    fontSize: T.base,
    fontWeight: 600,
    cursor: "pointer",
  } as CSSProperties,
  lbl: {
    fontSize: T.sm,
    color: C.muted,
    marginBottom: 6,
    display: "block",
    fontWeight: 500,
  } as CSSProperties,
};
