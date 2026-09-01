import { C, R, T } from "../lib/constants";
import type { TxType } from "../types";

/**
 * Gasto / Ingreso. Es el campo más caro de equivocar —los mismos $5,000
 * suman o restan según esto— y estaba copiado en tres modales con tres
 * nombres de estado distintos. Un solo sitio para el color y el énfasis.
 */
export default function KindToggle({ value, onChange }: { value: TxType; onChange: (t: TxType) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      {(["gasto", "ingreso"] as const).map((t) => {
        const activo = value === t;
        const color = t === "gasto" ? C.red : C.green;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={activo}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: R.md,
              border: `2px solid ${activo ? color : C.border + "44"}`,
              background: activo ? color + "22" : "transparent",
              color: activo ? color : C.muted,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: T.base,
            }}
          >
            {t === "gasto" ? "🔴 Gasto" : "🟢 Ingreso"}
          </button>
        );
      })}
    </div>
  );
}
