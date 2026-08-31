// ============================================================================
// Avisos que se pueden descartar.
//
// Antes el banner de pago próximo reaparecía siempre: la condición seguía
// siendo cierta, así que tocarlo no servía de nada. Ahora se descarta por
// ciclo — la clave incluye la fecha de vencimiento, de modo que el aviso
// vuelve solo cuando hay algo nuevo que avisar, no cada vez que abres la app.
// ============================================================================

const KEY = "millions.avisos-descartados";

type Dismissed = Record<string, string>; // clave → fecha en que se descartó

const leer = (): Dismissed => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

const escribir = (d: Dismissed) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* modo privado o almacenamiento lleno: el aviso simplemente no se recuerda */
  }
};

export const dismissAlert = (key: string): void => {
  const d = leer();
  d[key] = new Date().toISOString().slice(0, 10);
  // Se limpian las claves viejas para que el registro no crezca sin fin
  const limite = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(d)) if (d[k] < limite) delete d[k];
  escribir(d);
};

export const isDismissed = (key: string): boolean => !!leer()[key];

/**
 * Clave del aviso de créditos. Incluye a qué vencimiento corresponde, así que
 * al llegar el siguiente corte la clave cambia y el aviso vuelve solo.
 * Un pago vencido lleva su propia clave: eso sí merece insistir.
 */
export const creditAlertKey = (items: { id: string; days: number }[]): string =>
  "credito:" +
  items
    .map((c) => `${c.id}@${c.days <= 0 ? "vencido" : c.days}`)
    .sort()
    .join(",");

/**
 * Clave del aviso de presupuestos: mes en curso más las categorías al límite.
 * Si se pasa otra categoría, la clave cambia y vuelve a avisar.
 */
export const budgetAlertKey = (categories: string[], now = new Date()): string =>
  `presupuesto:${now.getFullYear()}-${now.getMonth() + 1}:${[...categories].sort().join(",")}`;
