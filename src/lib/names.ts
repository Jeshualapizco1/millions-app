// ============================================================================
// Resolver un nombre contra los datos del usuario.
//
// Vive aparte de `actions.ts` a propósito: ahí arriba se importa `api.ts`, que
// construye el cliente de Supabase al cargarse. Una función pura que se puede
// probar sin variables de entorno no debe arrastrar media app con ella.
// ============================================================================

/**
 * Exacto primero, luego parcial **único**. Si hay varios candidatos falla en
 * vez de tomar el primero: con cuentas como "BBVA" y "BBVA Oro", quedarse con
 * la que aparezca antes en la lista mueve dinero a la cuenta equivocada sin
 * decir nada. La usan el asesor y la captura por voz.
 */
export const findByName = <T extends { name: string }>(list: T[], name: string, tipo: string): T => {
  const needle = (name ?? "").trim().toLowerCase();
  const exact = list.find((x) => x.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = list.filter((x) => x.name.toLowerCase().includes(needle) || needle.includes(x.name.toLowerCase()));
  if (partial.length === 1) return partial[0];
  throw new Error(
    partial.length > 1
      ? `"${name}" coincide con varios: ${partial.map((x) => x.name).join(", ")}`
      : `No encontré ${tipo} "${name}". Tienes: ${list.map((x) => x.name).join(", ") || "ninguna"}`
  );
};
