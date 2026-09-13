import { useEffect, useRef } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import { C, MOTION, FONT } from "../../lib/constants";
import { reducedMotion, useAppearance } from "../../lib/appearance";
import { fmt, fmtShort } from "../../lib/format";

export interface MonthlyDatum { label: string; ingresos: number; gastos: number; }

/** Dos series comparables; la tabla contigua en Análisis conserva los importes exactos. */
export default function MonthlyChart({ data }: { data: MonthlyDatum[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ch = useRef<Chart | null>(null);
  const { theme } = useAppearance();
  useEffect(() => {
    if (!ref.current) return;
    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          { label: "Ingresos", data: data.map((d) => d.ingresos), backgroundColor: C.accent, borderRadius: 4, maxBarThickness: 18 },
          { label: "Gastos", data: data.map((d) => d.gastos), backgroundColor: C.muted, borderRadius: 4, maxBarThickness: 18 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: reducedMotion() ? false : { duration: MOTION.chart },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: C.text, font: { family: FONT.body, size: 12 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(Number(ctx.raw))}` } },
        },
        scales: {
          x: { ticks: { color: C.muted, font: { size: 12 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: C.muted, callback: (v) => fmtShort(v) }, grid: { color: C.border + "50" } },
        },
      },
    };
    if (!ch.current) ch.current = new Chart(ref.current, config);
    else { ch.current.data = config.data; ch.current.options = config.options!; ch.current.update(reducedMotion() ? "none" : undefined); }
  }, [data, theme]);
  useEffect(() => () => { ch.current?.destroy(); ch.current = null; }, []);
  return <canvas ref={ref} role="img" aria-label="Ingresos y gastos por mes. Importes exactos en la tabla siguiente." style={{ maxHeight: 220 }} />;
}
