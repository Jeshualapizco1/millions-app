import type { CSSProperties } from "react";
import type { CreditType } from "../types";

// Valores de la revisión aprobada. Hex reales para conservar los usos C.color + alpha.
export const PALETTES = {
  dark: { bg: "#0c0d11", surface: "#181a20", card: "#23262f", border: "#414652", accent: "#3c5fe0", aLight: "#a5b7ff", green: "#b9c8ff", red: "#ffa6b0", text: "#f5f5f2", muted: "#a2a7b5", amber: "#e4cb84" },
  light: { bg: "#f4f4f1", surface: "#ffffff", card: "#eceef3", border: "#b0b7c5", accent: "#3457d5", aLight: "#2948b5", green: "#2948b5", red: "#ab2944", text: "#181d29", muted: "#545e70", amber: "#796019" },
} as const;
export type Theme = keyof typeof PALETTES;
export const C: Record<keyof typeof PALETTES.dark, string> = { ...PALETTES.dark };
export function applyPalette(theme: Theme) { Object.assign(C, PALETTES[theme]); }
export const FONT = { body: "'DM Sans', sans-serif", display: "Manrope, sans-serif" };
export const MOTION = { press: 120, fade: 180, sheet: 220, chart: 280, ease: "cubic-bezier(.2,.7,.2,1)" } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40 } as const;

export const ACC_COLORS = ["#5678ff", "#8697c8", "#c792a9", "#8796a8", "#8a91bb", "#7889ad", "#a6aac6", "#beb090"];
export const ACC_ICONS = ["🏦", "💳", "💵", "💰", "🏧", "📱", "🛒", "🌸", "💎", "🪙"];

export const CATS: Record<string, { icon: string; color: string }> = {
  "Alimentación": { icon: "🍔", color: "#c792a9" },
  "Transporte": { icon: "🚗", color: "#3b82f6" },
  "Salud": { icon: "💊", color: "#ec4899" },
  "Educación": { icon: "📚", color: "#0ea5e9" },
  "Entretenimiento": { icon: "🎬", color: "#a855f7" },
  "Servicios": { icon: "💡", color: "#eab308" },
  "Compras": { icon: "🛍️", color: "#06b6d4" },
  "Nómina": { icon: "💼", color: "#8697c8" },
  "Ventas": { icon: "🌸", color: "#a5b7ff" },
  "Transferencia": { icon: "↔️", color: "#8b5cf6" },
  "Otros": { icon: "📦", color: "#6b7280" },
};

export const CREDIT_TYPES: Record<CreditType, { icon: string; color: string; label: string }> = {
  tarjeta: { icon: "💳", color: "#839ade", label: "Tarjeta" },
  hipoteca: { icon: "🏠", color: "#3b82f6", label: "Hipoteca" },
  auto: { icon: "🚗", color: "#c792a9", label: "Auto" },
  personal: { icon: "💼", color: "#9c9ec5", label: "Personal" },
  otro: { icon: "📋", color: "#6b7280", label: "Otro" },
};

export const GOAL_ICONS = ["🎯", "🏠", "🚗", "✈️", "💍", "📱", "💻", "🎓", "🏖️", "💰", "🛡️", "🎸"];
export const GOAL_COLORS = ACC_COLORS;

/** Escala de lectura de la integración: cuerpo 16, etiquetas 14, metadatos 12–13. */
export const T = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 16,
  lg: 16,
  xl: 18,
  xxl: 20,
  hero: 28,
} as const;

/** Radios por función; pill se reserva a controles circulares o etiquetas. */
export const R = {
  sm: 10,
  md: 15,
  lg: 24,
  pill: 999,
} as const;

/** Estilos compartidos que en el monolito vivían como `s` dentro de App. */
export const S = {
  get card(): CSSProperties { return {
    background: C.card,
    border: `1px solid ${C.border}22`,
    borderRadius: R.lg,
    padding: 20,
    marginBottom: 20,
  }; },
  get inp(): CSSProperties { return {
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
  }; },
  btn: (bg: string = C.accent): CSSProperties => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: R.md,
    padding: "13px 20px",
    minHeight: 48,
    fontSize: T.base,
    fontWeight: 600,
    cursor: "pointer",
  }),
  get btnO(): CSSProperties { return {
    background: "transparent",
    color: C.aLight,
    border: `1px solid ${C.accent}44`,
    borderRadius: R.md,
    padding: "13px 20px",
    fontSize: T.base,
    fontWeight: 600,
    cursor: "pointer",
  }; },
  get lbl(): CSSProperties { return {
    fontSize: T.sm,
    color: C.muted,
    marginBottom: 6,
    display: "block",
    fontWeight: 500,
  }; },
};
