import { useMemo, useState } from "react";
import TxRow from "../components/TxRow";
import { C, R, S, T } from "../lib/constants";
import { useCategories } from "../lib/categories";
import { exportCSV } from "../lib/csv";
import { filterByPeriod, PERIODS, type PeriodKey } from "../lib/periods";
import type { Account, Transaction } from "../types";

const PAGE = 50;

const KIND_FILTERS: { key: string; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "gasto", label: "Gastos" },
  { key: "ingreso", label: "Ingresos" },
  { key: "transferencia", label: "Transferencias" },
  { key: "pago_credito", label: "Pagos" },
  { key: "abono_meta", label: "Abonos" },
];

export default function Historial({
  txs,
  totalTxs,
  historialCompleto,
  accs,
  onDelete,
  onEdit,
  onImport,
  onCapture,
}: {
  txs: Transaction[];
  /** Cuántos hay en la base; mientras carga es mayor que `txs.length`. */
  totalTxs: number;
  /** false mientras el historial viejo sigue llegando (D9). */
  historialCompleto: boolean;
  accs: Account[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onImport: () => void;
  /** Abre la captura por voz, igual que el FAB. */
  onCapture: () => void;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("todos");
  const [cat, setCat] = useState("");
  const [accId, setAccId] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("todo");
  const [shown, setShown] = useState(PAGE);
  const { list } = useCategories();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return filterByPeriod(txs, period).filter((t) => {
      if (kind !== "todos" && t.kind !== kind) return false;
      if (cat && t.category !== cat) return false;
      if (accId && t.accountId !== accId) return false;
      if (needle && !t.description.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [txs, q, kind, cat, accId, period]);

  const anyFilter = q || kind !== "todos" || cat || accId || period !== "todo";
  const reset = () => { setQ(""); setKind("todos"); setCat(""); setAccId(""); setPeriod("todo"); setShown(PAGE); };

  const chipStyle = (active: boolean, color = C.accent) => ({
    padding: "6px 12px",
    borderRadius: R.pill,
    border: `1px solid ${active ? color : C.border + "44"}`,
    background: active ? color + "22" : "transparent",
    color: active ? C.aLight : C.muted,
    fontSize: T.sm,
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
    whiteSpace: "nowrap" as const,
  });

  return (
    <div className="fadeUp">
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: T.base, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Historial</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onImport} title="Importar del banco" style={{ ...S.btn(), padding: "7px 14px", fontSize: T.sm, background: `${C.accent}22`, color: C.aLight, border: `1px solid ${C.accent}44` }}>📥 Importar</button>
            {filtered.length > 0 && (
              <button onClick={() => exportCSV(filtered)} title={historialCompleto ? "Exporta lo que estás viendo" : "Exporta lo que estás viendo; el historial viejo todavía se está cargando"} style={{ ...S.btn(), padding: "7px 14px", fontSize: T.sm, background: `${C.accent}22`, color: C.aLight, border: `1px solid ${C.accent}44` }}>📤 Exportar</button>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        <input
          style={{ ...S.inp, marginBottom: 10 }}
          placeholder="Buscar por descripción…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
        />

        {/* Tipo */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
          {KIND_FILTERS.map((k) => (
            <button key={k.key} onClick={() => { setKind(k.key); setShown(PAGE); }} style={chipStyle(kind === k.key)}>{k.label}</button>
          ))}
        </div>

        {/* Período */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setShown(PAGE); }} style={chipStyle(period === p.key)}>{p.label}</button>
          ))}
        </div>

        {/* Categoría y cuenta */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <select style={{ ...S.inp, flex: 1, padding: "10px 12px" }} value={cat} onChange={(e) => { setCat(e.target.value); setShown(PAGE); }}>
            <option value="">Toda categoría</option>
            {list.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
          <select style={{ ...S.inp, flex: 1, padding: "10px 12px" }} value={accId} onChange={(e) => { setAccId(e.target.value); setShown(PAGE); }}>
            <option value="">Toda cuenta</option>
            {accs.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: T.sm, color: C.muted }}>
            {filtered.length} {filtered.length === 1 ? "movimiento" : "movimientos"}
            {/* Sin esto la lista parecería completa y faltarían meses enteros. */}
            {!historialCompleto && totalTxs > txs.length && ` · cargando ${totalTxs - txs.length} más…`}
          </span>
          {anyFilter && <button onClick={reset} style={{ background: "none", border: "none", color: C.aLight, fontSize: T.sm, cursor: "pointer" }}>Limpiar filtros</button>}
        </div>

        {filtered.length === 0 && txs.length > 0 && (
          <div style={{ color: C.muted, fontSize: T.md, textAlign: "center", padding: 20 }}>Ningún movimiento coincide con estos filtros</div>
        )}
        {txs.length === 0 && (
          // Todavía no hay nada que filtrar: en vez de un "sin transacciones"
          // seco, el mismo gesto que el FAB y la salida del CSV para quien
          // trae el historial de su banco.
          <div style={{ textAlign: "center", padding: "20px 8px 8px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sin movimientos aún</div>
            <div style={{ fontSize: T.md, color: C.muted, lineHeight: 1.5, marginBottom: 18 }}>
              Toca ＋ y di algo como “gasté 200 en el Ley”, o importa el CSV de tu banco con el botón de arriba.
            </div>
            <button onClick={onCapture} style={{ ...S.btn(), padding: "11px 18px" }}>🎙️ Capturar el primero</button>
          </div>
        )}
        {filtered.slice(0, shown).map((t) => <TxRow key={t.id} tx={t} onDelete={onDelete} onEdit={onEdit} />)}
        {filtered.length > shown && (
          <button onClick={() => setShown((s) => s + PAGE)} style={{ ...S.btnO, width: "100%", marginTop: 14 }}>
            Ver más ({filtered.length - shown} restantes)
          </button>
        )}
      </div>
    </div>
  );
}
