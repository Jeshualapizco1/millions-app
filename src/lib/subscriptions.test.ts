import { describe, expect, it } from "vitest";
import { hasActiveProAccess, type ProSubscription } from "./subscriptions";

const now = Date.parse("2026-09-13T20:00:00Z");
const future = "2026-09-14T20:00:00Z";
const subscription = (status: string, expires_at: string | null): ProSubscription => ({ entitlement: "pro", status, expires_at });

describe("acceso concedido en subscriptions", () => {
  it("un acceso permanente activo sigue vigente sin depender del alta ni del reloj", () => {
    expect(hasActiveProAccess(subscription("active", null), now)).toBe(true);
    expect(hasActiveProAccess(subscription("active", null), now + 3650 * 86400000)).toBe(true);
  });
  it.each(["active", "trialing", "in_grace_period", "cancelled"])("respeta la vigencia restante de %s", status => {
    expect(hasActiveProAccess(subscription(status, future), now)).toBe(true);
    expect(hasActiveProAccess(subscription(status, new Date(now).toISOString()), now)).toBe(false);
    expect(hasActiveProAccess(subscription(status, "2026-09-12T20:00:00Z"), now)).toBe(false);
  });
  it.each(["expired", "paused", "billing_issue", "unknown"])("no abre la app con estado %s, aunque la fecha sea futura", status => {
    expect(hasActiveProAccess(subscription(status, future), now)).toBe(false);
    expect(hasActiveProAccess(subscription(status, null), now)).toBe(false);
  });
  it.each(["trialing", "in_grace_period", "cancelled"])("no convierte %s sin fecha en acceso permanente", status => {
    expect(hasActiveProAccess(subscription(status, null), now)).toBe(false);
  });
  it("no concede pro si falta el permiso, pertenece a otro producto o la fecha es inválida", () => {
    expect(hasActiveProAccess(null, now)).toBe(false);
    expect(hasActiveProAccess({ ...subscription("active", null), entitlement: "community" }, now)).toBe(false);
    expect(hasActiveProAccess(subscription("active", "not-a-date"), now)).toBe(false);
  });
});
