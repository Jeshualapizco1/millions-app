import type { CSSProperties } from "react";
import { C, R, S } from "../lib/constants";

/**
 * Bloque gris que respira mientras llega lo de verdad. Un esqueleto con la
 * forma de lo que va a aparecer se siente más rápido que un spinner en medio
 * de la nada, aunque tarde lo mismo: la persona ya sabe qué va a ver y dónde.
 */
export function Skeleton({ h = 14, w = "100%", style }: { h?: number | string; w?: number | string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: h,
        width: w,
        borderRadius: R.sm,
        background: `linear-gradient(90deg, ${C.border}55 25%, ${C.border}99 50%, ${C.border}55 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** Una tarjeta del tablero, en gris: título, cifra grande y dos líneas. */
export function SkeletonCard({ lineas = 2, alto }: { lineas?: number; alto?: number }) {
  return (
    <div style={{ ...S.card, minHeight: alto }} aria-hidden="true">
      <Skeleton h={12} w="40%" style={{ marginBottom: 14 }} />
      <Skeleton h={28} w="60%" style={{ marginBottom: 14 }} />
      {Array.from({ length: lineas }, (_, i) => (
        <Skeleton key={i} h={12} w={`${85 - i * 15}%`} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}
