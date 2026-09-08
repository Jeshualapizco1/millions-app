/** El modelo actual solo aplica gasto/ingreso a cuentas de efectivo o débito. */
export function namesCreditPurchase(text: string, type: string, accountName: string, credits: { name: string; type: string }[]) {
  if (type !== "gasto") return false;
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const words = normalize(text);
  if (/\bdebito\b/.test(words)) return false;
  if (/\btarjeta\s+(?:de\s+)?credito\b/.test(words)) return true;
  if (!/\btarjeta\b/.test(words)) return false;
  const target = normalize(accountName);
  return credits.some(c => c.type === "tarjeta" && target && (normalize(c.name) === target || normalize(c.name).includes(target)));
}
