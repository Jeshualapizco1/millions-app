import { lazy, Suspense, useMemo, useState } from "react";
import { Skeleton } from "../components/Skeleton";
import Icon from "../components/Icon";
import Money, { PrivacyButton, useMoneyPrivacy } from "../components/Money";
import { monthSummary } from "../lib/presentation";
import { monthLabel } from "../lib/format";
import type { Category, Transaction } from "../types";
import type { Projection } from "../lib/analytics";
const MonthlyChart = lazy(() => import("../components/charts/MonthlyChart"));

export default function Analisis({ txs, categories, complete, onLoadAll, onAsk, projection, now = new Date() }: {
  txs: Transaction[]; categories: Category[]; complete: boolean; onLoadAll: () => Promise<unknown>; onAsk: (question: string) => void; projection: Projection; now?: Date;
}) {
  const [offset, setOffset] = useState(0);
  const selected = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = selected.getFullYear(), month = selected.getMonth();
  const summary = useMemo(() => monthSummary(txs, year, month, categories), [txs, year, month, categories]);
  const history = useMemo(() => Array.from({ length: 6 }, (_, i) => { const d = new Date(year, month - 5 + i, 1); const m = monthSummary(txs, d.getFullYear(), d.getMonth(), categories); return { label: monthLabel(d), ingresos: m.income, gastos: m.spend }; }), [txs, year, month, categories]);
  const label = selected.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const { hidden } = useMoneyPrivacy();
  return <div className="fadeUp">
    <div className="chart-month-picker"><button className="icon-button" onClick={() => setOffset((v) => v - 1)} aria-label="Mes anterior"><Icon name="atras"/></button><h2 style={{ textTransform: "capitalize" }}>{label}</h2><button className="icon-button" onClick={() => setOffset((v) => Math.min(v + 1, 0))} disabled={offset >= 0} aria-label="Mes siguiente"><Icon name="flecha"/></button><PrivacyButton/></div>
    {!complete && <p role="status" className="hint">Los datos históricos aún están cargando. <button className="text-link" onClick={() => void onLoadAll()}>Cargar historial completo</button></p>}
    <div className="month-stats"><div><p>Ingresos</p><Money value={summary.income} size="stat"/></div><div><p>Gastos</p><Money value={summary.spend} size="stat"/></div></div>
    <div className="section-head" style={{ marginTop: 18 }}><span className="hint">Diferencia del mes</span><Money value={summary.income-summary.spend} signed/></div>
    <button onClick={() => onAsk(`Ayúdame a entender mis ingresos, gastos y categorías de ${label}. Usa ese mes como período y distingue los datos registrados de las estimaciones.`)} className="text-link"><Icon name="asesor" size={19}/>Preguntar sobre este mes<Icon name="flecha" size={16}/></button>
    <section className="section"><h2>Ingresos vs. gastos</h2><p className="hint" style={{ margin: "8px 0 18px" }}>Últimos seis meses hasta {label}. Las transferencias y pagos a créditos no son consumo.</p>
      {hidden ? <p className="hint">Gráfico oculto</p> : <><div style={{ height: 210 }}><Suspense fallback={<Skeleton h={210}/>}><MonthlyChart data={history}/></Suspense></div><details style={{ marginTop: 14 }}><summary className="hint">Ver cifras del gráfico</summary><table className="chart-table"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead><tbody>{history.map((h) => <tr key={h.label}><td>{h.label}</td><td><Money value={h.ingresos}/></td><td><Money value={h.gastos}/></td></tr>)}</tbody></table></details></>}
    </section>
    <section className="section"><h2>Gastos por categoría</h2><p className="hint" style={{ margin: "8px 0 12px" }}>Qué pesó más en {label}.</p>
      {summary.categories.length === 0 ? <div className="empty-state"><Icon name="grafico" size={32}/><p>Sin gastos registrados en este mes. Tus categorías aparecerán al registrar un gasto.</p></div> : summary.categories.map((d) => <div key={d.label} style={{ padding: "14px 0" }}><div className="section-head" style={{ marginBottom: 0 }}><span>{d.icon} {d.label}</span><Money value={d.value}/></div>{!hidden && <><div className="category-track"><span style={{ width: `${summary.spend > 0 ? d.value/summary.spend*100 : 0}%`, background: d.color }}/></div><p className="hint" style={{ marginTop: 5 }}>{summary.spend > 0 ? Math.round(d.value/summary.spend*100) : 0}% del gasto</p></>}</div>)}
    </section>
    {offset === 0 && summary.rows.length > 0 && <section className="section"><h2>Proyección de cierre</h2><p className="hint" style={{ margin: "8px 0 12px" }}>Estimación según tus registros, el ritmo del mes y los fijos disponibles. Puede cambiar; no es un saldo garantizado.</p><div className="month-stats"><div><p>Gasto estimado</p><Money value={projection.projectedSpend} size="stat"/></div><div><p>Diferencia estimada</p><Money value={projection.projectedNet} size="stat"/></div></div></section>}
  </div>;
}
