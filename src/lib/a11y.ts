import type { KeyboardEvent } from "react";

/**
 * Props para que un `div` o `span` que se toca se comporte como botón para
 * quien navega con teclado o con lector de pantalla: rol, foco con Tab, y
 * Enter o Espacio lo activan. Se usa donde convertirlo en `<button>` de
 * verdad rompería el layout (tarjetas enteras, filas con hijos en bloque).
 */
export const clickable = (onClick: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  },
});
