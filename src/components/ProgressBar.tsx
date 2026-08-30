import type { CSSProperties } from "react";
import { C } from "../lib/constants";

/** Barra de progreso compartida (créditos: 6px sin transición; presupuestos/metas: 8px con transición). */
export default function ProgressBar({
  pct,
  color,
  height = 8,
  animated = false,
  style,
}: {
  pct: number;
  color: string;
  height?: number;
  animated?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ height, borderRadius: height / 2, background: C.border, overflow: "hidden", ...style }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: height / 2,
          ...(animated ? { transition: "width 0.4s ease" } : {}),
        }}
      />
    </div>
  );
}
