import { createContext, useContext, type ReactNode } from "react";
import type { Category } from "../types";

/**
 * Las categorías dejaron de ser una constante del código: viven por usuario en
 * la base. Este contexto las expone a toda la app para que un icono, un color
 * o una categoría nueva no requieran tocar nueve componentes.
 */
export interface CategoryLook {
  icon: string;
  color: string;
}

interface Ctx {
  /** Lista visible, en orden. */
  list: Category[];
  /** Icono y color por nombre, con respaldo para nombres desconocidos. */
  look: (name: string) => CategoryLook;
}

const FALLBACK: CategoryLook = { icon: "📦", color: "#6b7280" };

const CategoriesContext = createContext<Ctx>({ list: [], look: () => FALLBACK });

export function CategoriesProvider({ categories, children }: { categories: Category[]; children: ReactNode }) {
  const byName = new Map(categories.map((c) => [c.name, c]));
  const value: Ctx = {
    list: categories,
    look: (name) => {
      const c = byName.get(name);
      return c ? { icon: c.icon, color: c.color } : FALLBACK;
    },
  };
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export const useCategories = () => useContext(CategoriesContext);
