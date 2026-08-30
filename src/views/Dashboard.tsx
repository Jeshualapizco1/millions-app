import TxRow from "../components/TxRow";
import DonutChart, { type DonutDatum } from "../components/charts/DonutChart";
import MonthlyChart, { type MonthlyDatum } from "../components/charts/MonthlyChart";
import { C, S } from "../lib/constants";
import { fmt } from "../lib/format";
import { PERIODS, type PeriodKey } from "../lib/periods";
import type { Account, Transaction } from "../types";

export interface Comparison {
  thisGastos: number;
  lastGastos: number;
  thisIngresos: number;
  lastIngresos: number;
  diffPct: number | null;
}

export default function Dashboard({
  accs,
  txs,
  totBal,
  totI,
  totG,
  totalDebt,
  period,
  onPeriod,
  periodLabel,
  comparison,
  monthlyData,
  catData,
  onEditAcc,
  onNewAcc,
  onGoHist,
}: {
  accs: Account[];
  txs: Transaction[];
  totBal: number;
  totI: number;
  totG: number;
  totalDebt: number;
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  periodLabel: string;
  comparison: Comparison;
  monthlyData: MonthlyDatum[];
  catData: DonutDatum[];
  onEditAcc: (a: Account) => void;
  onNewAcc: () => void;
  onGoHist: () => void;
}) {
  return (
    <div className="fadeUp">
      {/* Saldo total */}
      <div style={{ background: "linear-gradient(135deg,#1a1a3e,#0f0f2e)", border: `1px solid ${C.accent}33`, borderRadius: 24, padding: "24px 20px", marginBottom: 14, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: C.accent + "11" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "#9333ea11" }} />
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Saldo Total</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: totBal >= 0 ? C.green : C.red, letterSpacing: -1 }}>{fmt(totBal)}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Ingresos</div><div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{fmt(totI)}</div></div>
          <div style={{ width: 1, background: C.border }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Gastos</div><div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>{fmt(totG)}</div></div>
          {totalDebt > 0 && <><div style={{ width: 1, background: C.border }} /><div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Deudas</div><div style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{fmt(totalDebt)}</div></div></>}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 10 }}>Ingresos y gastos de: {periodLabel.toLowerCase()}</div>
      </div>

      {/* Selector de período: manda sobre TODAS las cifras de abajo */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriod(p.key)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${period === p.key ? C.accent : C.border + "44"}`,
              background: period === p.key ? C.accent + "22" : "transparent",
              color: period === p.key ? C.aLight : C.muted,
              fontSize: 12.5,
              cursor: "pointer",
              fontWeight: period === p.key ? 700 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Comparativa mes a mes (solo tiene sentido viendo el mes en curso) */}
      {period === "mes" && comparison.diffPct !== null && (
        <div style={{ ...S.card, display: "flex", gap: 10 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Gastos este mes</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>{fmt(comparison.thisGastos)}</div>
            <div style={{ fontSize: 12, marginTop: 2, color: comparison.diffPct > 0 ? C.red : C.green, fontWeight: 600 }}>
              {comparison.diffPct > 0 ? "↑" : "↓"} {Math.abs(comparison.diffPct)}% vs mes pasado
            </div>
          </div>
          <div style={{ width: 1, background: C.border }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Mes pasado</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.muted }}>{fmt(comparison.lastGastos)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>referencia</div>
          </div>
        </div>
      )}

      {/* Gráfica 6 meses (siempre 6 meses, independiente del período) */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Últimos 6 meses</div>
        <div style={{ height: 200 }}><MonthlyChart data={monthlyData} /></div>
      </div>

      {/* Gastos por categoría */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Gastos por categoría</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>{periodLabel}</div>
        <div style={{ height: 160, marginBottom: 14 }}><DonutChart data={catData} /></div>
        {catData.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} /><span style={{ fontSize: 13 }}>{d.icon} {d.label}</span></div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ fontSize: 11, color: C.muted }}>{totG > 0 ? Math.round((d.value / totG) * 100) : 0}%</span><span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{fmt(d.value)}</span></div>
          </div>
        ))}
        {catData.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 12 }}>Sin gastos en este período</div>}
      </div>

      {/* Cuentas */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Mis cuentas</div>
        {accs.map((a) => (
          <div key={a.id} onClick={() => onEditAcc(a)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.border}22`, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{a.icon}</div>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div><div style={{ fontSize: 11, color: C.muted }}>Toca para editar</div></div>
            </div>
            <div style={{ fontWeight: 800, color: Number(a.balance) >= 0 ? C.green : C.red, fontSize: 15 }}>{fmt(a.balance)}</div>
          </div>
        ))}
        <button onClick={onNewAcc} style={{ ...S.btn(), width: "100%", marginTop: 14, background: `${C.accent}22`, color: C.aLight, border: `1px solid ${C.accent}44`, padding: "10px" }}>＋ Nueva cuenta</button>
      </div>

      {/* Recientes */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Recientes</div>
          {txs.length > 5 && <button onClick={onGoHist} style={{ background: "none", border: "none", color: C.aLight, fontSize: 12, cursor: "pointer" }}>Ver todo →</button>}
        </div>
        {txs.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>Sin transacciones aún</div>}
        {txs.slice(0, 5).map((t) => <TxRow key={t.id} tx={t} />)}
      </div>
    </div>
  );
}
