-- ============================================================================
-- Millions v2 — motor de movimientos recurrentes
-- Un job diario genera las transacciones vencidas de cada regla activa.
-- (Aplicada al proyecto el 2026-08-30 vía MCP.)
-- ============================================================================

create extension if not exists pg_cron with schema cron;

-- Avanza una fecha segun la frecuencia. Postgres ya resuelve bien el borde:
-- 31 de enero + 1 mes = 28/29 de febrero, sin desbordarse a marzo.
create or replace function public.advance_date(p_date date, p_freq public.recurring_frequency)
returns date language sql immutable set search_path = public as $$
  select case p_freq
    when 'semanal'   then p_date + interval '7 days'
    when 'quincenal' then p_date + interval '14 days'
    when 'mensual'   then p_date + interval '1 month'
    when 'anual'     then p_date + interval '1 year'
  end::date
$$;

-- Proximas ocurrencias de las reglas del usuario (para "proximos dias").
create or replace function public.upcoming_recurring(p_days int default 7)
returns table (rule_id uuid, name text, kind public.tx_kind, amount numeric, account_id uuid, due date)
language plpgsql security invoker set search_path = public as $$
declare r record; d date; i int;
begin
  for r in select * from recurring_rules where active order by next_run loop
    d := r.next_run;
    i := 0;
    while d <= current_date + p_days and i < 10 loop
      rule_id := r.id; name := r.name; kind := r.kind;
      amount := r.amount; account_id := r.account_id; due := d;
      return next;
      d := advance_date(d, r.frequency);
      i := i + 1;
    end loop;
  end loop;
end $$;

-- SECURITY DEFINER porque lo dispara el cron, sin sesion de usuario: no hay
-- auth.uid(). Cada fila se escribe con el user_id que trae su propia regla,
-- asi que el aislamiento se mantiene.
create or replace function public.run_recurring_rules()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_next date; v_guard int; v_total int := 0;
begin
  for r in select * from recurring_rules where active and next_run <= current_date loop
    v_next := r.next_run;
    v_guard := 0;
    -- Genera TODAS las ocurrencias vencidas: si el job no corrio unos dias,
    -- al volver se ponen al corriente en vez de perderse.
    while v_next <= current_date and v_guard < 60 loop
      insert into transactions (user_id, account_id, kind, amount, description, category_id, date, recurring_id)
      values (r.user_id, r.account_id, r.kind, r.amount, r.name, r.category_id, v_next::timestamptz, r.id);
      update accounts set balance = balance + tx_delta(r.kind, r.amount)
      where id = r.account_id and user_id = r.user_id;
      v_next := advance_date(v_next, r.frequency);
      v_guard := v_guard + 1;
      v_total := v_total + 1;
    end loop;
    update recurring_rules set next_run = v_next, last_run = current_date where id = r.id;
  end loop;
  return v_total;
end $$;

revoke execute on function public.run_recurring_rules() from public, anon, authenticated;
grant execute on function public.run_recurring_rules() to service_role;
grant execute on function public.advance_date(date, public.recurring_frequency) to authenticated;
grant execute on function public.upcoming_recurring(int) to authenticated;

-- 13:00 UTC = 6:00 AM en Mazatlan (UTC-7 todo el año, sin horario de verano)
select cron.schedule('millions-recurring', '0 13 * * *', $job$select public.run_recurring_rules()$job$);
