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
  | "llave" | "salir" | "exportar" | "candado" | "documento" | "mas" | "microfono"
  | "grafico" | "perfil" | "ojo" | "ojo-cerrado" | "flecha" | "atras" | "cerrar"
  | "check" | "repetir" | "transferir" | "sonido" | "silencio" | "sol" | "luna";

const PATHS: Record<IconName, string> = {
  grafico: "M4 20h16M6 16v-5M12 16V4M18 16V8",
  perfil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2",
  ojo: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  "ojo-cerrado": "M3 3l18 18M10 5c7-1 12 7 12 7s-1 2-3 4M6 6c-3 2-4 6-4 6s4 7 10 7c2 0 4-1 5-2M10 10a3 3 0 0 0 4 4",
  flecha: "M5 12h14M13 6l6 6-6 6",
  atras: "M19 12H5M11 6l-6 6 6 6",
  cerrar: "M6 6l12 12M6 18L18 6",
  check: "M5 12l4 4L19 6",
  repetir: "M3 11V5h6M3 5a9 9 0 0 1 17 5M21 13v6h-6M21 19a9 9 0 0 1-17-5",
  transferir: "M3 7h18M17 3l4 4-4 4M21 17H3M7 13l-4 4 4 4",
  sonido: "M11 4L6 8H2v8h4l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14",
  silencio: "M11 4L6 8H2v8h4l5 4zM16 9l6 6M16 15l6-6",
  sol: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1",
  luna: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z",
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
