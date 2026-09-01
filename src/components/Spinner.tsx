/**
 * Rueda pequeña para botones. Reemplaza el "..." que no se movía y no decía
 * si algo estaba pasando o se había trabado.
 */
export default function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <span
      role="progressbar"
      aria-label="Cargando"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        verticalAlign: "middle",
      }}
    />
  );
}
