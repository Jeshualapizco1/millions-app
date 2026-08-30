import TxRow from "../components/TxRow";
import { C, S } from "../lib/constants";
import { exportCSV } from "../lib/csv";
import type { Transaction } from "../types";

export default function Historial({ txs, onDelete }: { txs: Transaction[]; onDelete: (id: string) => void }) {
  return (
    <div className="fadeUp">
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Historial completo</div>
          {txs.length > 0 && <button onClick={() => exportCSV(txs)} style={{ ...S.btn(), padding: "7px 14px", fontSize: 12, background: `${C.accent}22`, color: C.aLight, border: `1px solid ${C.accent}44` }}>📤 Exportar</button>}
        </div>
        {txs.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>Sin transacciones aún</div>}
        {txs.map((t) => <TxRow key={t.id} tx={t} onDelete={onDelete} />)}
      </div>
    </div>
  );
}
