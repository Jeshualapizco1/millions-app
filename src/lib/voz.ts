// ============================================================================
// Qué decirle a la persona cuando el dictado no funciona.
//
// Los dos motores (la API del navegador y el plugin nativo) fallan por las
// mismas razones pero las nombran distinto, así que aquí se traducen a un
// puñado de casos y de ahí a una frase que dice qué pasó y qué hacer.
//
// Lo importante es lo que NO es un fallo: cortar el micrófono a propósito
// (`aborted`) y callarse (`no-speech`) llegan por el mismo canal que un error
// de verdad, y avisar de eso sería regañar a la persona por usar la app bien.
// ============================================================================

export type FalloDeVoz = "sin-permiso" | "sin-motor" | "sin-microfono" | "sin-red" | "ocupado" | "otro";

/** La plataforma decide dónde se activa el permiso, y eso cambia la frase. */
export type PlataformaDeVoz = "ios" | "android" | "web";

/**
 * Traduce el código del motor a uno de nuestros casos.
 *
 * `null` significa "no pasó nada malo, no avises": es la salida normal de
 * cerrar el micrófono o de no decir nada.
 */
export function clasificarFalloDeVoz(codigo: string | null | undefined): FalloDeVoz | null {
  // El plugin nativo no devuelve códigos: lanza Error con una frase en inglés.
  // "Ongoing speech recognition" es iOS negándose a abrir el micrófono porque
  // la escucha anterior sigue viva, y merece su propio aviso: si vuelve a
  // aparecer queremos reconocerlo en pantalla y no tener que ir a la consola.
  if (typeof codigo === "string" && /ongoing speech recognition/i.test(codigo)) return "ocupado";

  switch (codigo) {
    // Los dos silencios que no son fallo.
    case "aborted":
    case "no-speech":
      return null;

    case "not-allowed":
    case "service-not-allowed":
    case "sin-permiso":
      return "sin-permiso";

    case "audio-capture":
    case "sin-microfono":
      return "sin-microfono";

    case "network":
    case "sin-red":
      return "sin-red";

    case "language-not-supported":
    case "sin-motor":
      return "sin-motor";

    default:
      return "otro";
  }
}

/**
 * La frase que ve la persona. Todas terminan ofreciendo escribir el gasto:
 * el dictado es un atajo, nunca el único camino, y quien está frente a un
 * micrófono muerto necesita saber que puede seguir usando la app.
 */
export function mensajeDeFalloDeVoz(fallo: FalloDeVoz, plataforma: PlataformaDeVoz): string {
  switch (fallo) {
    case "sin-permiso":
      if (plataforma === "ios") {
        return "Millions necesita el micrófono. Actívalo en Ajustes → Millions → Micrófono, o escribe el gasto.";
      }
      if (plataforma === "android") {
        return "Millions necesita el micrófono. Actívalo en Ajustes → Aplicaciones → Millions → Permisos, o escribe el gasto.";
      }
      return "Tu navegador bloqueó el micrófono. Permítelo en el candado de la barra de direcciones, o escribe el gasto.";

    case "sin-motor":
      return "Este dispositivo no tiene dictado en español. Escribe el gasto y lo registro igual.";

    case "sin-microfono":
      return "No encuentro ningún micrófono. Escribe el gasto y lo registro igual.";

    case "sin-red":
      return "El dictado necesita internet. Escribe el gasto: se guarda y se sincroniza solo.";

    case "ocupado":
      return "El dictado anterior no había terminado de cerrarse. Toca el micrófono otra vez o escribe el gasto; si se repite, cierra la app y ábrela de nuevo.";

    case "otro":
      return "No pude escucharte. Inténtalo otra vez o escribe el gasto.";
  }
}

/**
 * El camino completo, que es lo que usa el hook: de código a frase, con
 * `null` cuando no hay nada que decir.
 */
export function avisoDeFalloDeVoz(codigo: string | null | undefined, plataforma: PlataformaDeVoz): string | null {
  const fallo = clasificarFalloDeVoz(codigo);
  return fallo === null ? null : mensajeDeFalloDeVoz(fallo, plataforma);
}
