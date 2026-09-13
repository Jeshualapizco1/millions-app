import { useEffect, useRef } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import { C, MOTION, FONT } from "../lib/constants";
import { reducedMotion, useAppearance } from "../lib/appearance";
import { fmt, fmtShort } from "../lib/format";
import type { NetWorthPoint } from "../lib/analytics";

export default function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ch = useRef<Chart | null>(null);
  const { theme } = useAppearance();
  useEffect(() => {
    if (!ref.current) return;
    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          { label: "Patrimonio", data: data.map((d) => d.net), borderColor: C.aLight, backgroundColor: C.accent + "18", borderWidth: 3, pointRadius: 3, pointBackgroundColor: C.aLight, fill: true, tension: 0.18 },
          { label: "Saldos", data: data.map((d) => d.assets), borderColor: C.muted, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0.18 },
          { label: "Deuda", data: data.map((d) => d.debt), borderColor: C.red, borderWidth: 2, borderDash: [2, 4], pointRadius: 0, tension: 0.18 },
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
          y: { ticks: { color: C.muted, callback: (v) => fmtShort(v) }, grid: { color: C.border + "50" } },
        },
      },
    };
    if (!ch.current) ch.current = new Chart(ref.current, config);
    else { ch.current.data = config.data; ch.current.options = config.options!; ch.current.update(reducedMotion() ? "none" : undefined); }
  }, [data, theme]);
  useEffect(() => () => { ch.current?.destroy(); ch.current = null; }, []);
  return <canvas ref={ref} role="img" aria-label="Evolución estimada del patrimonio. Importes exactos en la tabla siguiente." style={{ maxHeight: 220 }} />;
}
