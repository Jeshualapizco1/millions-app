/**
 * Iconos de interfaz, en SVG de trazo. Sustituyen a los emoji de la barra de
 * pestañas y de las acciones (editar, borrar, pausar…), que cada sistema
 * dibuja distinto y no se pueden colorear ni alinear.
 *
 * Los emoji de categorías, cuentas y metas se quedan: son datos que la
 * persona eligió, no iconos de la app.
 */
export type IconName =
  | "inicio" | "metas" | "creditos" | "asesor" | "historial" | "cuentas"
  | "editar" | "borrar" | "pausar" | "reanudar"
  | "llave" | "salir" | "exportar" | "candado" | "documento" | "mas" | "microfono";

const PATHS: Record<IconName, string> = {
  inicio: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  metas: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  creditos: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20M6 15h4",
  asesor: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.9A8 8 0 1 1 21 12zM8 12h.01M12 12h.01M16 12h.01",
  historial: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  cuentas: "M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 18h18M12 3l9 5H3z",
  editar: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  borrar: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6",
  pausar: "M7 4h3v16H7zM14 4h3v16h-3z",
  reanudar: "M6 4l14 8-14 8z",
  llave: "M7.5 19.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM10.5 12.5L21 2M15 8l3 3",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  exportar: "M12 3v12M7 8l5-5 5 5M4 21h16",
  candado: "M4 11h16v10H4zM8 11V7a4 4 0 0 1 8 0v4",
  documento: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
  mas: "M12 5v14M5 12h14",
  microfono: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM19 11a7 7 0 0 1-14 0M12 18v3M8 21h8",
};

export default function Icon({ name, size = 20, strokeWidth = 2, style }: { name: IconName; size?: number; strokeWidth?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
