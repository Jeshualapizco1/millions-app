import { useEffect, useRef } from "react";

/**
 * Confeti disparado desde las dos esquinas de abajo hacia arriba.
 *
 * Sin librería: son divs con la Web Animations API. La alternativa habitual
 * (canvas-confetti) pesa ~7 KB gzip y traería un canvas a pantalla completa
 * para tres segundos de animación que ocurren una sola vez en la vida de la
 * cuenta. Aquí cada partícula sigue una parábola calculada en JS, que es lo
 * único que CSS solo no puede hacer sin generar keyframes por partícula.
 *
 * Se apaga solo al terminar y respeta `prefers-reduced-motion`: para quien
 * marcó esa preferencia el sistema, el confeti no aparece. Es una decoración,
 * y una decoración no debe provocar mareo a nadie.
 */

const COLORES = ["#7c6af7", "#a89ff9", "#4ade80", "#fbbf24", "#f472b6", "#00b1ea", "#fb923c"];

/** Partículas por cañón. Suficientes para que se vea lleno sin tirar los fps en un teléfono. */
const POR_CANON = 45;

export default function Confeti() {
  const capa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = capa.current;
    if (!nodo) return;

    // Quien pidió menos movimiento no recibe confeti. La felicitación se lee
    // igual de bien sin él.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const piezas: HTMLDivElement[] = [];
    const animaciones: Animation[] = [];

    // Un cañón en cada esquina de abajo, apuntando hacia arriba y al centro.
    const canones = [
      { x: 0, y: h, dir: 1 },   // izquierda, dispara a la derecha
      { x: w, y: h, dir: -1 },  // derecha, dispara a la izquierda
    ];

    for (const canon of canones) {
      for (let i = 0; i < POR_CANON; i++) {
        const pieza = document.createElement("div");
        const ancho = 6 + Math.random() * 5;
        const alto = 9 + Math.random() * 7;
        pieza.style.cssText = `position:absolute;left:${canon.x}px;top:${canon.y}px;width:${ancho}px;height:${alto}px;background:${COLORES[(Math.random() * COLORES.length) | 0]};border-radius:${Math.random() < 0.3 ? "50%" : "2px"};will-change:transform,opacity;`;
        nodo.appendChild(pieza);
        piezas.push(pieza);

        // Disparo entre 55° y 85° sobre la horizontal: bien hacia arriba, con
        // suficiente apertura para que no salgan todas en la misma línea.
        const angulo = (55 + Math.random() * 30) * (Math.PI / 180);
        const fuerza = h * (0.85 + Math.random() * 0.75);
        const vx = Math.cos(angulo) * fuerza * canon.dir;
        const vy = -Math.sin(angulo) * fuerza;
        const gravedad = h * 2.1;
        const duracion = 2200 + Math.random() * 1400;
        const giro = (Math.random() - 0.5) * 1080;

        // La parábola se muestrea en pasos; con menos de ~16 se nota poligonal.
        const pasos = 24;
        const cuadros = Array.from({ length: pasos + 1 }, (_, k) => {
          const t = k / pasos;
          const x = vx * t;
          const y = vy * t + 0.5 * gravedad * t * t;
          return {
            transform: `translate(${x}px, ${y}px) rotate(${giro * t}deg)`,
            // Se desvanece solo al final: apagarse antes se ve como un parpadeo.
            opacity: t < 0.75 ? 1 : (1 - t) / 0.25,
          };
        });

        const anim = pieza.animate(cuadros, { duration: duracion, easing: "linear", fill: "forwards" });
        animaciones.push(anim);
      }
    }

    return () => {
      animaciones.forEach((a) => a.cancel());
      piezas.forEach((p) => p.remove());
    };
  }, []);

  return (
    <div
      ref={capa}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        // Encima del contenido pero por debajo de cualquier modal, y sin
        // robarse los toques: la persona tiene que poder tocar "Empezar"
        // mientras el confeti sigue cayendo.
        zIndex: 60,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
