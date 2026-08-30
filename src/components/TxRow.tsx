import { C, CATS } from "../lib/constants";
import { fmt } from "../lib/format";
import type { Transaction } from "../types";

export default function TxRow({ tx, onDelete }: { tx: Transaction; onDelete?: (id: string) => void }) {
  const cat = CATS[tx.category] || CATS["Otros"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}22` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: cat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{tx.category} · {tx.accountName} · {new Date(tx.date).toLocaleDateString("es-MX")}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 10 }}>
        <div style={{ fontWeight: 800, color: tx.type === "gasto" ? C.red : C.green, fontSize: 15 }}>{tx.type === "gasto" ? "-" : "+"}{fmt(tx.amount)}</div>
        {onDelete && <button onClick={() => onDelete(tx.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15, padding: 4 }}>🗑</button>}
      </div>
    </div>
  );
}
