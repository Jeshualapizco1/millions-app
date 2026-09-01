import type { CSSProperties, ReactNode } from "react";
import { C, R, T } from "../lib/constants";

/**
 * La caja roja de error de los formularios. Estaba copiada a mano en nueve
 * modales (una de ellas con los colores en hexadecimal suelto): cambiar el
 * tono o el radio era tocar nueve archivos y olvidar uno.
 */
export default function ErrorBox({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      role="alert"
      style={{
        background: C.red + "18",
        border: `1px solid ${C.red}44`,
        borderRadius: R.sm,
        padding: "10px 14px",
        fontSize: T.md,
        color: C.red,
        marginBottom: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
