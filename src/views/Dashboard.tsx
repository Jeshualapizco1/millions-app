import { lazy, Suspense } from "react";
import TxRow from "../components/TxRow";
import type { DonutDatum } from "../components/charts/DonutChart";
import type { MonthlyDatum } from "../components/charts/MonthlyChart";

const DonutChart = lazy(() => import("../components/charts/DonutChart"));
const MonthlyChart = lazy(() => import("../components/charts/MonthlyChart"));
const NetWorthChart = lazy(() => import("../components/NetWorthChart"));

const ChartFallback = ({ h }: { h: number }) => (
  <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b6a8a", fontSize: 12 }}>Cargando gráfica…</div>
);
import Vacio from "./Vacio";
import { C, S } from "../lib/constants";
import { fmt } from "../lib/format";
import { PERIODS, type PeriodKey } from "../lib/periods";
import { iconoDe, type Proximo } from "../lib/upcoming";
import { fmtCurrency, toBase, type FxRates } from "../lib/currency";
import type { Account, Transaction } from "../types";
import type { NetWorthPoint, Projection } from "../lib/analytics";

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
  totI,
  totG,
  totalDebt,
  proximos,
  upcomingNet,
  netWorth,
  projection,
  fx,
  period,
  onPeriod,
  periodLabel,
  comparison,
  monthlyData,
  catData,
  onEditAcc,
  onNewAcc,
  onGoHist,
  nombre,
  onArranque,
  onAddCredit,
  onCapture,
}: {
  accs: Account[];
  txs: Transaction[];
  totI: number;
  totG: number;
  totalDebt: number;
  proximos: Proximo[];
  upcomingNet: number;
  netWorth: NetWorthPoint[];
  projection: Projection;
  fx: FxRates;
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  periodLabel: string;
  comparison: Comparison;
  monthlyData: MonthlyDatum[];
  catData: DonutDatum[];
  onEditAcc: (a: Account) => void;
  onNewAcc: () => void;
  onGoHist: () => void;
  nombre: string;
  /** Volver a abrir el arranque guiado para quien lo saltó. */
  onArranque: () => void;
  onAddCredit: () => void;
  /** Abre la captura por voz, igual que el FAB. */
  onCapture: () => void;
}) {
  // Sin cuentas no hay saldo, ni patrimonio, ni nada que graficar: seis
  // tarjetas en cero no le dicen a nadie qué hacer. Tres botones sí.
  if (accs.length === 0) return <Vacio nombre={nombre} onNewAcc={onNewAcc} onArranque={onArranque} onAddCredit={onAddCredit} />;

  return (
    <div className="fadeUp">
      {/* Ingresos, gastos y deuda del período. El saldo total ya vive en el
          header: repetirlo aquí en grande era el número más visible de la
          pantalla, dos veces. El patrimonio neto de abajo trae el delta. */}
      <div style={{ ...S.card, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Ingresos</div><div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{fmt(totI)}</div></div>
          <div style={{ width: 1, background: C.border }} />
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Gastos</div><div style={{ fontSize: 16, fontWeight: 800, color: C.red }}>{fmt(totG)}</div></div>
          {totalDebt > 0 && <><div style={{ width: 1, background: C.border }} /><div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>Deudas</div><div style={{ fontSize: 16, fontWeight: 800, color: C.amber }}>{fmt(totalDebt)}</div></div></>}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: "center" }}>{periodLabel}</div>
      </div>

      {/* Patrimonio neto: activos menos deudas, el número que resume todo */}
      {(() => {
        const hoy = netWorth[netWorth.length - 1];
        const antes = netWorth[0];
        if (!hoy) return null;
        const cambio = hoy.net - antes.net;
        const pct = antes.net !== 0 ? Math.round((cambio / Math.abs(antes.net)) * 100) : null;
        const sube = cambio >= 0;
        return (
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Patrimonio neto</div>
              {netWorth.length > 1 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: sube ? C.green : C.red }}>
                  {sube ? "↑" : "↓"} {fmt(Math.abs(cambio))}{pct !== null ? ` (${sube ? "+" : ""}${pct}%)` : ""}
                </div>
              )}
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: hoy.net >= 0 ? C.green : C.red, letterSpacing: -0.5, marginBottom: 2 }}>{fmt(hoy.net)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
              {fmt(hoy.assets)} en cuentas − {fmt(hoy.debt)} de deuda
            </div>
            {netWorth.length > 1 && (
              <>
                <div style={{ height: 200 }}>
                  <Suspense fallback={<ChartFallback h={200} />}><NetWorthChart data={netWorth} /></Suspense>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
                  El dato de hoy es exacto. Los meses anteriores se reconstruyen a partir de tus movimientos,
                  así que un saldo o una deuda que hayas ajustado a mano no se refleja ahí.
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Proyección de cierre de mes */}
      {period === "mes" && projection.daysElapsed > 0 && projection.spentSoFar > 0 && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Cierre de mes estimado</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Llevas gastado</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.red }}>{fmt(projection.spentSoFar)}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmt(projection.dailyRate)} por día</div>
            </div>
            <div style={{ width: 1, background: C.border }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Cerrarías en</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.amber }}>{fmt(projection.projectedSpend)}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>día {projection.daysElapsed} de {projection.daysInMonth}</div>
            </div>
          </div>
          {projection.pendingFixed > 0 && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              Incluye {fmt(projection.pendingFixed)} de movimientos fijos que aún no ocurren.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${C.border}22`, fontSize: 13 }}>
            <span style={{ color: C.muted }}>Balance estimado del mes</span>
            <span style={{ fontWeight: 800, color: projection.projectedNet >= 0 ? C.green : C.red }}>
              {projection.projectedNet >= 0 ? "+" : ""}{fmt(projection.projectedNet)}
            </span>
          </div>
        </div>
      )}

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

      {/* Lo que viene: fijos del servidor + cortes y pagos de tarjeta */}
      {proximos.length > 0 && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Próximos 7 días</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Movimientos fijos, cortes y pagos de tus créditos</div>
          {proximos.map((u) => {
            const cuando = u.dias < 0 ? `Vencido hace ${Math.abs(u.dias)} ${Math.abs(u.dias) === 1 ? "día" : "días"}` : u.dias === 0 ? "Hoy" : u.dias === 1 ? "Mañana" : `En ${u.dias} días`;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 16 }}>{iconoDe(u.tipo)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: u.dias <= 1 ? C.amber : C.muted }}>
                      {cuando}{u.tipo === "fijo" ? " · se registra solo" : ""}
                    </div>
                  </div>
                </div>
                {/* Un corte no mueve dinero: se avisa, no se cobra. Y un crédito
                    sin mensualidad fija tampoco tiene monto que mostrar. */}
                <div style={{ fontSize: 13, fontWeight: 700, color: u.amount === 0 ? C.muted : u.kind === "gasto" ? C.red : C.green }}>
                  {u.amount === 0 ? (u.tipo === "corte" ? "corte" : "—") : `${u.kind === "gasto" ? "-" : "+"}${fmt(u.amount)}`}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
            <span style={{ color: C.muted }}>Impacto neto</span>
            <span style={{ fontWeight: 700, color: upcomingNet >= 0 ? C.green : C.red }}>
              {upcomingNet >= 0 ? "+" : ""}{fmt(upcomingNet)}
            </span>
          </div>
        </div>
      )}

      {/* Gráfica 6 meses (siempre 6 meses, independiente del período) */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Últimos 6 meses</div>
        <div style={{ height: 200 }}><Suspense fallback={<ChartFallback h={200} />}><MonthlyChart data={monthlyData} /></Suspense></div>
      </div>

      {/* Gastos por categoría */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Gastos por categoría</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>{periodLabel}</div>
        <div style={{ height: 160, marginBottom: 14 }}><Suspense fallback={<ChartFallback h={160} />}><DonutChart data={catData} /></Suspense></div>
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
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div><div style={{ fontSize: 11, color: C.muted }}>{a.currency && a.currency !== "MXN" ? a.currency : "Toca para editar"}</div></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, color: Number(a.balance) >= 0 ? C.green : C.red, fontSize: 15 }}>{fmtCurrency(a.balance, a.currency)}</div>
              {a.currency && a.currency !== "MXN" && <div style={{ fontSize: 11, color: C.muted }}>≈ {fmt(toBase(a.balance, a.currency, fx))}</div>}
            </div>
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
        {txs.length === 0 && (
          // Ya hay cuenta pero ni un movimiento: el siguiente paso es capturar
          // uno, y el botón abre lo mismo que el FAB con el micrófono encendido.
          <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
            <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
              Sin movimientos aún. Toca ＋ y di algo como “gasté 200 en el Ley”.
            </div>
            <button onClick={onCapture} style={{ ...S.btn(), padding: "11px 18px" }}>🎙️ Capturar el primero</button>
          </div>
        )}
        {txs.slice(0, 5).map((t) => <TxRow key={t.id} tx={t} />)}
      </div>
    </div>
  );
}
