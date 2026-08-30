import { useEffect, useRef } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";
import { C } from "../lib/constants";
import { fmt, fmtShort } from "../lib/format";
import type { NetWorthPoint } from "../lib/analytics";

/** Línea de patrimonio con activos y deuda de fondo. */
export default function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ch = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    ch.current?.destroy();
    const config = {
      type: "line",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "Patrimonio",
            data: data.map((d) => d.net),
            borderColor: C.aLight,
            backgroundColor: "#a89ff922",
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: C.aLight,
            fill: true,
            tension: 0.3,
            order: 1,
          },
          {
            label: "Activos",
            data: data.map((d) => d.assets),
            borderColor: "#4ade8066",
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            order: 2,
          },
          {
            label: "Deuda",
            data: data.map((d) => d.debt),
            borderColor: "#f8717166",
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            order: 3,
          },
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
