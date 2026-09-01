/**
 * Consumo de IA del día, tal como lo reporta el servidor. Cuenta captura y
 * asesor por igual: ambos pasan por la misma función y el mismo tope.
 *
 * El tope viaja desde el servidor (variable de entorno) y no se copia aquí:
 * una copia en el cliente tarde o temprano diría un número distinto.
 */
export interface AiUso {
  /** Llamadas hechas hoy, con corte a medianoche de Mazatlán. */
  hoy: number;
  /** Tope diario por persona. */
  tope: number;
}

/** Nunca negativo: si el tope bajó a media jornada, "quedan -3" no ayuda. */
export const consultasRestantes = (u: AiUso): number => Math.max(0, u.tope - u.hoy);

/**
 * Frase para la interfaz. Devuelve null sin datos (antes de la primera carga
 * o si el servidor no contestó): mejor no decir nada que inventar un número.
 */
export function textoAiUso(u: AiUso | null): { texto: string; agotado: boolean } | null {
  if (!u) return null;
  const restan = consultasRestantes(u);
  if (restan === 0) return { texto: "Se acabaron las consultas de hoy. Mañana se renuevan.", agotado: true };
  if (restan === 1) return { texto: `Te queda 1 consulta de IA hoy, de ${u.tope}.`, agotado: false };
  return { texto: `Te quedan ${restan} consultas de IA hoy, de ${u.tope}.`, agotado: false };
}
