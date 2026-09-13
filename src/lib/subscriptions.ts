import type { Tables } from "./database.types";

/** El cliente solo lee el permiso concedido por el servidor a su cuenta. */
export type ProSubscription = Pick<Tables<"subscriptions">, "entitlement" | "status" | "expires_at">;

export function hasActiveProAccess(subscription: ProSubscription | null, now = Date.now()): boolean {
  if (!subscription || subscription.entitlement !== "pro") return false;
  if (!["active", "trialing", "in_grace_period", "cancelled"].includes(subscription.status)) return false;
  // Un acceso activo sin vencimiento es permanente. Una cancelación, prueba
  // o gracia necesita una fecha futura; no puede regalar acceso indefinido.
  if (subscription.expires_at === null) return subscription.status === "active";
  const expires = Date.parse(subscription.expires_at);
  return Number.isFinite(expires) && expires > now;
}
