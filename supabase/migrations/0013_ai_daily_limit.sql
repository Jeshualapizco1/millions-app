-- ============================================================================
-- Millions v2 — tope diario de IA
-- Con solo un tope por hora y otro por mes quedaba un hueco: 20 por hora
-- durante un dia son 480 llamadas, mas que el mes entero. Un tope diario lo
-- cierra y ademas es lo unico que se le puede explicar a una persona.
--
-- El dia se corta a medianoche de Mazatlan, no UTC: con UTC el contador se
-- reiniciaria a las 5 de la tarde, que no es "otro dia" para nadie.
-- (Aplicada al proyecto el 2026-08-31 via MCP.)
-- ============================================================================

create or replace function public.ai_calls_today(p_user uuid)
returns integer language sql security definer set search_path = public as $$
  select count(*)::int
  from ai_usage
  where user_id = p_user
    -- Escrito asi (y no truncando created_at) para que use el indice
    and created_at >= (date_trunc('day', now() at time zone 'America/Mazatlan') at time zone 'America/Mazatlan')
$$;

revoke execute on function public.ai_calls_today(uuid) from public, anon, authenticated;
grant execute on function public.ai_calls_today(uuid) to service_role;
