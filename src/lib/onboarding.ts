// ============================================================================
// Arranque guiado: el cuestionario y el mensaje de bienvenida.
//
// Vive como datos y no como JSX por la misma razón que legal.ts: así el texto
// se puede probar sin montar componentes, y la pantalla queda siendo solo
// pintura.
//
// La decisión de fondo: el arranque NO pide configurar la app. Preguntar
// saldos y sueldo en el primer minuto es pedir números que nadie trae a la
// mano, y ahí es donde la gente se cae. Pregunta qué busca la persona, que sí
// sabe contestar de memoria, y con eso la app se vuelve suya de inmediato.
//
// Las llaves ("salir_deudas") son lo que se guarda; el texto visible puede
// reescribirse sin invalidar las respuestas ya recogidas.
// ============================================================================

/** Sube esto si cambias las preguntas de forma que las respuestas dejen de ser comparables. */
export const SURVEY_VERSION = "1";

export interface Opcion {
  key: string;
  emoji: string;
  label: string;
}

export interface Pregunta {
  /** Campo de user_survey donde aterriza. */
  field: "goal" | "pains" | "current_tool" | "dream" | "source";
  title: string;
  /** Bajo el título, en gris. Explica por qué preguntamos. */
  hint: string;
  /** "una" avanza al tocar; "varias" espera el botón; "texto" es campo libre. */
  kind: "una" | "varias" | "texto";
  options?: Opcion[];
  placeholder?: string;
}

// ── El cuestionario ─────────────────────────────────────────────────────────
// Cinco pantallas, un toque cada una. La última es la administrativa: va al
// final a propósito, porque abrir con "¿cómo nos encontraste?" hace que la
// conversación arranque siendo sobre nosotros y no sobre la persona.
export const PREGUNTAS: Pregunta[] = [
  {
    field: "goal",
    title: "¿Qué te trajo a Millions?",
    hint: "No hay respuesta incorrecta. Nos ayuda a ponerte al frente lo que sí te sirve.",
    kind: "una",
    options: [
      { key: "salir_deudas", emoji: "💳", label: "Salir de deudas" },
      { key: "ahorrar_algo", emoji: "🎯", label: "Ahorrar para algo que quiero" },
      { key: "saber_gastos", emoji: "🔍", label: "Saber a dónde se me va el dinero" },
      { key: "dejar_vivir_al_dia", emoji: "🌊", label: "Dejar de vivir al día" },
      { key: "ordenarme_invertir", emoji: "📈", label: "Ordenarme para poder invertir" },
    ],
  },
  {
    field: "pains",
    title: "¿Qué es lo que más te cuesta hoy?",
    hint: "Puedes elegir varias.",
    kind: "varias",
    options: [
      { key: "no_se_en_que", emoji: "🌫️", label: "No sé en qué se me va" },
      { key: "fechas_pago", emoji: "📅", label: "Se me pasan las fechas de pago" },
      { key: "gasto_mas", emoji: "📉", label: "Gasto más de lo que gano" },
      { key: "ahorro_y_gasto", emoji: "🕳️", label: "Ahorro y luego me lo acabo" },
      { key: "varias_tarjetas", emoji: "🃏", label: "Tengo varias tarjetas y me pierdo" },
      { key: "no_alcanza_ahorrar", emoji: "😮‍💨", label: "Nunca me alcanza para ahorrar" },
    ],
  },
  {
    field: "current_tool",
    title: "¿Cómo llevas tus cuentas hoy?",
    hint: "Con toda honestidad. La mayoría contesta la primera.",
    kind: "una",
    options: [
      { key: "en_mi_cabeza", emoji: "🧠", label: "En mi cabeza" },
      { key: "libreta", emoji: "📓", label: "Una libreta o las notas del teléfono" },
      { key: "excel", emoji: "📊", label: "Excel o Google Sheets" },
      { key: "otra_app", emoji: "📱", label: "Otra app" },
      { key: "no_las_llevo", emoji: "🤷", label: "No las llevo" },
    ],
  },
  {
    field: "dream",
    title: "¿Qué cambiaría en tu vida si tuvieras tu dinero bajo control?",
    hint: "Escríbelo como lo sientas. Es opcional, pero es la respuesta que más nos dice.",
    kind: "texto",
    placeholder: "Dormir tranquilo, dejar de pelear por dinero, poder viajar…",
  },
  {
    field: "source",
    title: "Una última: ¿cómo llegaste a Millions?",
    hint: "Nos dice dónde seguir invitando gente.",
    kind: "una",
    options: [
      { key: "recomendacion", emoji: "🗣️", label: "Me lo recomendaron" },
      { key: "instagram", emoji: "📸", label: "Instagram o Facebook" },
      { key: "tiktok", emoji: "🎵", label: "TikTok" },
      { key: "youtube", emoji: "▶️", label: "YouTube" },
      { key: "google", emoji: "🔎", label: "Buscando en Google" },
      { key: "otro", emoji: "✨", label: "De otra manera" },
    ],
  },
];

export interface Respuestas {
  goal: string | null;
  pains: string[];
  current_tool: string | null;
  dream: string;
  source: string | null;
}

export const RESPUESTAS_VACIAS: Respuestas = { goal: null, pains: [], current_tool: null, dream: "", source: null };

// ── Lo que Millions hace por cada meta ──────────────────────────────────────
// Frases en segunda persona y en concreto: nombran una capacidad que la app
// de verdad tiene. Prometer aquí algo que no existe es la forma más rápida de
// perder a alguien en la semana uno.
const POR_META: Record<string, string> = {
  salir_deudas:
    "Millions es de las pocas apps que entiende la tarjeta mexicana: día de corte, día de pago y cuánto llevas usado de tu línea.",
  ahorrar_algo:
    "Pon tu meta con fecha y Millions te dice cuánto apartar y si vas a tiempo, sin que tengas que sacar la calculadora.",
  saber_gastos:
    "Captura tus gastos hablando, en segundos, y el análisis te enseña las categorías que de verdad pesan.",
  dejar_vivir_al_dia:
    "Desde el día 5 del mes verás cómo vas a cerrarlo, con tiempo de corregir en lugar de enterarte el día 30.",
  ordenarme_invertir:
    "Primero el piso: tu patrimonio neto, tu gasto real y un techo mensual que sí se sostenga.",
};

// ── Cómo nombramos cada dolor y qué contestamos ─────────────────────────────
const POR_DOLOR: Record<string, { nombre: string; respuesta: string }> = {
  no_se_en_que: {
    nombre: "no saber en qué se te va",
    respuesta: "Cada gasto que captures se clasifica solo, y al final del mes ya no hay misterio.",
  },
  fechas_pago: {
    nombre: "que se te pasen las fechas de pago",
    respuesta: "Millions te avisa antes de cada corte y cada pago. Ninguna se te va a pasar otra vez.",
  },
  gasto_mas: {
    nombre: "gastar más de lo que entra",
    respuesta: "Vas a ver la proyección de cierre de mes desde los primeros días, cuando todavía se puede corregir.",
  },
  ahorro_y_gasto: {
    nombre: "que el ahorro no se te quede",
    respuesta: "Aparta el dinero en una meta y sepáralo de tus cuentas: lo que no se ve, no se gasta.",
  },
  varias_tarjetas: {
    nombre: "llevar varias tarjetas a la vez",
    respuesta: "Cada tarjeta con su corte, su pago y su utilización, todas en la misma pantalla.",
  },
  no_alcanza_ahorrar: {
    nombre: "que nunca alcance para ahorrar",
    respuesta: "Un techo de gasto mensual con arrastre: lo que no gastaste este mes se suma al siguiente.",
  },
};

export interface Bienvenida {
  titulo: string;
  parrafos: string[];
}

/**
 * Arma la pantalla de cierre con lo que la persona acaba de contestar.
 *
 * El objetivo es que lea como si alguien la hubiera escuchado, no como un
 * "bienvenido" con su nombre pegado. Por eso cada párrafo sale de una
 * respuesta concreta y, si no contestó algo, ese párrafo no aparece: un
 * relleno genérico delataría que en realidad nadie leyó nada.
 */
export function bienvenida(nombre: string, r: Respuestas): Bienvenida {
  const parrafos: string[] = [
    "Acabas de hacer lo que la mayoría pospone durante años: sentarte a ver tu dinero de frente. Eso ya es la parte difícil. 🎉",
  ];

  const meta = r.goal ? POR_META[r.goal] : undefined;
  if (meta) parrafos.push(meta);

  // Solo el primer dolor. Contestarle los seis convertiría la felicitación en
  // un folleto de funciones, que es justo lo contrario de sentirse escuchado.
  const dolor = r.pains.map((p) => POR_DOLOR[p]).find(Boolean);
  if (dolor) parrafos.push(`Nos dijiste que lo que más te pesa es ${dolor.nombre}. ${dolor.respuesta}`);

  const sueno = r.dream.trim();
  if (sueno) {
    parrafos.push(`Y esto que escribiste es la razón de todo lo demás:\n«${sueno}»\nTe lo vamos a recordar los días en que cueste.`);
  }

  parrafos.push("Empieza capturando un gasto de hoy. Puedes dictarlo: «gasté 250 en la comida».");

  return { titulo: `Vas muy bien, ${nombre}`, parrafos };
}

/**
 * Resumen para el asesor de IA. Va dentro del system prompt para que responda
 * sabiendo qué busca la persona desde su primera consulta, en vez de esperar a
 * que se lo explique.
 */
export function contextoParaAsesor(r: Partial<Respuestas>): string {
  const partes: string[] = [];
  const metas: Record<string, string> = {
    salir_deudas: "salir de deudas",
    ahorrar_algo: "ahorrar para una meta concreta",
    saber_gastos: "entender a dónde se le va el dinero",
    dejar_vivir_al_dia: "dejar de vivir al día",
    ordenarme_invertir: "ordenar sus finanzas para empezar a invertir",
  };
  if (r.goal && metas[r.goal]) partes.push(`Su objetivo principal es ${metas[r.goal]}.`);

  const dolores = (r.pains ?? []).map((p) => POR_DOLOR[p]?.nombre).filter(Boolean);
  if (dolores.length) partes.push(`Lo que más le cuesta: ${dolores.join("; ")}.`);

  const herramientas: Record<string, string> = {
    en_mi_cabeza: "no llevaba registro, solo mentalmente",
    libreta: "llevaba sus cuentas en una libreta o notas del teléfono",
    excel: "venía de una hoja de cálculo",
    otra_app: "venía de otra app de finanzas",
    no_las_llevo: "no llevaba ningún registro",
  };
  if (r.current_tool && herramientas[r.current_tool]) partes.push(`Antes de Millions ${herramientas[r.current_tool]}.`);

  // En sus palabras: es lo que mejor calibra el tono de la respuesta.
  // Recortado y en una sola línea: es texto libre que escribió la persona y
  // va dentro del prompt; 300 caracteres bastan para el tono y no dan para
  // instrucciones largas disfrazadas de sueño.
  const sueno = (r.dream ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (sueno) partes.push(`Cuando le preguntamos qué cambiaría en su vida al tener el dinero bajo control, respondió: "${sueno}".`);

  if (!partes.length) return "";
  return `QUÉ BUSCA ESTA PERSONA (lo contestó al registrarse; úsalo para orientar tus consejos, pero no se lo recites de vuelta):\n${partes.join(" ")}`;
}
