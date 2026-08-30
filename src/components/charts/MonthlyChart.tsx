import { useEffect, useRef } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import { C } from "../../lib/constants";
import { fmt, fmtShort } from "../../lib/format";

export interface MonthlyDatum {
  label: string;
  ingresos: number;
  gastos: number;
}

export default function MonthlyChart({ data }: { data: MonthlyDatum[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ch = useRef<Chart | null>(null);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    ch.current?.destroy();
    const config = {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          { label: "Ingresos", data: data.map((d) => d.ingresos), backgroundColor: "#4ade8044", borderColor: "#4ade80", borderWidth: 2, borderRadius: 6, order: 2 },
          { label: "Gastos", data: data.map((d) => d.gastos), backgroundColor: "#f8717144", borderColor: "#f87171", borderWidth: 2, borderRadius: 6, order: 2 },
          { type: "line", label: "Balance", data: data.map((d) => d.ingresos - d.gastos), borderColor: "#a89ff9", backgroundColor: "#a89ff922", borderWidth: 2, pointRadius: 4, pointBackgroundColor: "#a89ff9", fill: false, order: 1, tension: 0.3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: C.aLight, font: { size: 11 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; raw: unknown }) => `${ctx.dataset.label}: ${fmt(ctx.raw as number)}` } },
        },
        scales: {
          x: { ticks: { color: C.muted, font: { size: 11 } }, grid: { color: "#ffffff08" } },
          y: { ticks: { color: C.muted, callback: (v: string | number) => fmtShort(v) }, grid: { color: "#ffffff08" } },
        },
      },
    };
    ch.current = new Chart(ref.current, config as unknown as ChartConfiguration);
    return () => ch.current?.destroy();
  }, [data]);
  return <canvas ref={ref} style={{ maxHeight: 200 }} />;
}
