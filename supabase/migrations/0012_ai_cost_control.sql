-- ============================================================================
-- Millions v2 — control de costo de IA
-- Abrir la app a otras personas significa pagar su consumo. Sin un tope
-- global, el exito se convierte en una factura sin techo. Aqui se registra
-- que modelo se uso y cuanto costo cada llamada, para poder frenar a tiempo.
-- (Aplicada al proyecto el 2026-08-31 via MCP.)
-- ============================================================================

alter table public.ai_usage add column model text;
alter table public.ai_usage add column cost_usd numeric(10,6) not null default 0;

create index ai_usage_month_idx on public.ai_usage (created_at);

create or replace function public.ai_spend_this_month()
returns numeric language sql security definer set search_path = public as $$
  select coalesce(sum(cost_usd), 0)
  from ai_usage
  where created_at >= date_trunc('month', now())
$$;

create or replace function public.ai_calls_this_month(p_user uuid)
returns integer language sql security definer set search_path = public as $$
  select count(*)::int
  from ai_usage
  where user_id = p_user and created_at >= date_trunc('month', now())
$$;

revoke execute on function public.ai_spend_this_month() from public, anon, authenticated;
revoke execute on function public.ai_calls_this_month(uuid) from public, anon, authenticated;
grant execute on function public.ai_spend_this_month() to service_role;
grant execute on function public.ai_calls_this_month(uuid) to service_role;
