import { useSyncExternalStore } from "react";
import { applyPalette, C, type Theme } from "./constants";

type Appearance = { theme: Theme; haptics: boolean };
let state: Appearance = { theme: "dark", haptics: false };
const listeners = new Set<() => void>();
const key = "millions.appearance.v1";
try {
  const saved = JSON.parse(localStorage.getItem(key) || "null");
  if (saved) state = { theme: saved.theme === "light" ? "light" : "dark", haptics: saved.haptics === true };
} catch { /* Almacenamiento bloqueado: la preferencia vive durante la sesión. */ }
function paint() {
  applyPalette(state.theme);
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.colorScheme = state.theme;
  for (const [name, value] of Object.entries(C)) document.documentElement.style.setProperty(`--${name}`, value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", C.bg);
}
paint();
export function setAppearance(patch: Partial<Appearance>) {
  state = { ...state, ...patch };
  paint();
  try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Sin persistencia local. */ }
  listeners.forEach((fn) => fn());
}
export function useAppearance() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => state, () => state);
}
export const currentTheme = () => state.theme;
export function subscribeAppearance(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const hapticsEnabled = () => state.haptics;
export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
