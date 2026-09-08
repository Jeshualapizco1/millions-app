import { C, R, T } from "../lib/constants";
import Icon from "./Icon";
import { useCategories } from "../lib/categories";
import Money from "./Money";
import type { Transaction } from "../types";

/** Presentación por tipo de movimiento: los que no son gasto/ingreso tienen su propia identidad. */
const KIND_LOOK: Record<string, { icon: string; color: string; label: string }> = {
  transferencia: { icon: "↔️", color: "#839ade", label: "Transferencia" },
  pago_credito: { icon: "💳", color: "#b2a9c7", label: "Pago a crédito" },
  abono_meta: { icon: "🎯", color: "#829dcd", label: "Abono a meta" },
};

export default function TxRow({
  tx,
  onDelete,
  onEdit,
}: {
  tx: Transaction;
  onDelete?: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
}) {
  const { look } = useCategories();
  const special = KIND_LOOK[tx.kind];
  const cat = look(tx.category);
  const icon = special?.icon ?? cat.icon;
  const color = special?.color ?? cat.color;

  // Una transferencia no es gasto ni ingreso: se muestra neutral, sin signo.
  const isTransfer = tx.kind === "transferencia";
  const amountColor = isTransfer ? C.aLight : tx.type === "gasto" ? C.red : C.green;

  const subtitle = isTransfer
    ? `${tx.accountName} → ${tx.toAccountName ?? "—"}`
    : `${special?.label ?? tx.category} · ${tx.accountName}`;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: 4, padding: "12px 0", borderBottom: `1px solid ${C.border}22` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 150px", minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: R.md, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: T.base, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
          <div style={{ fontSize: T.xs, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle} · {new Date(tx.date).toLocaleDateString("es-MX")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 10 }}>
        <div style={{ fontWeight: 800, color: amountColor, fontSize: 15 }}><Money value={isTransfer || tx.type === "ingreso" ? tx.amount : -tx.amount} signed={!isTransfer}/></div>
        {/* Solo gastos e ingresos se editan; el resto se elimina y se vuelve a crear */}
        {onEdit && (tx.kind === "gasto" || tx.kind === "ingreso") && (
          <button onClick={() => onEdit(tx)} title="Editar" aria-label={`Editar ${tx.description}`} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6, display: "flex" }}><Icon name="editar" size={17} /></button>
        )}
        {onDelete && <button onClick={() => onDelete(tx.id)} title="Eliminar" aria-label={`Eliminar ${tx.description}`} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6, display: "flex" }}><Icon name="borrar" size={17} /></button>}
      </div>
    </div>
  );
}
