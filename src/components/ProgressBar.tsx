import { useMoneyPrivacy } from "./Money";
import { reducedMotion } from "../lib/appearance";
import type { CSSProperties } from "react";
import { C, MOTION } from "../lib/constants";

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
  const value = Math.max(0, Math.min(Number.isFinite(pct) ? pct : 0, 100));
  const { hidden } = useMoneyPrivacy();
  return (
    <div role="progressbar" aria-label={hidden ? "Progreso oculto" : "Progreso"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={hidden ? undefined : value} style={{ height, borderRadius: height / 2, background: C.border, overflow: "hidden", ...style }}>
      <div
        style={{
          height: "100%",
          width: hidden ? "0%" : `${value}%`,
          background: color,
          borderRadius: height / 2,
          ...(animated && !reducedMotion() ? { transition: `width ${MOTION.chart}ms ${MOTION.ease}` } : {}),
        }}
      />
    </div>
  );
}
