import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { C } from "../../lib/constants";
import { fmt } from "../../lib/format";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

export default function DonutChart({ data }: { data: DonutDatum[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ch = useRef<Chart<"doughnut"> | null>(null);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    ch.current?.destroy();
    ch.current = new Chart(ref.current, {
      type: "doughnut",
      data: { labels: data.map((d) => d.label), datasets: [{ data: data.map((d) => d.value), backgroundColor: data.map((d) => d.color), borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.raw as number)}` } } } },
    });
    return () => ch.current?.destroy();
  }, [data]);
  if (!data.length) return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 24 }}>Sin gastos aún</div>;
  return <canvas ref={ref} style={{ maxHeight: 160 }} />;
}
