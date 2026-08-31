-- ============================================================================
-- Millions v2 — tipos de cambio
-- Los saldos en USD/EUR necesitan convertirse para el total y el patrimonio.
-- Las tasas se traen del Banco Central Europeo (frankfurter.app, sin llave)
-- una vez al dia y se guardan aqui: el cliente nunca depende de una API
-- externa en tiempo real, y sin red usa la ultima conocida.
-- (Aplicada al proyecto el 2026-08-30 via MCP.)
-- ============================================================================

create extension if not exists pg_net with schema extensions;

create table public.fx_rates (
  base        char(3) not null,
  quote       char(3) not null,
  rate        numeric(18,8) not null check (rate > 0),
  as_of       date not null,
  updated_at  timestamptz not null default now(),
  primary key (base, quote)
);

-- Dato de referencia, igual para todos: se lee sin RLS por usuario, pero solo
-- el backend escribe. Nadie puede alterar una tasa desde el cliente.
alter table public.fx_rates enable row level security;
create policy fx_rates_read on public.fx_rates for select to authenticated using (true);

insert into public.fx_rates (base, quote, rate, as_of) values
  ('MXN', 'USD', 0.055, current_date),
  ('MXN', 'EUR', 0.051, current_date),
  ('MXN', 'CAD', 0.075, current_date),
  ('MXN', 'GBP', 0.043, current_date)
on conflict (base, quote) do nothing;

-- pg_net es asincrono: esta funcion solo dispara la peticion. La respuesta se
-- recoge despues en net._http_response y la procesa fx_collect().
create or replace function public.fx_request()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint;
begin
  select net.http_get('https://api.frankfurter.app/latest?from=MXN&to=USD,EUR,CAD,GBP') into v_id;
  return v_id;
end $$;

create or replace function public.fx_collect()
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare
  r record; v_body jsonb; v_date date; k text; v_count int := 0;
begin
  for r in
    select content from net._http_response
    where status_code = 200 and created > now() - interval '30 minutes'
    order by created desc limit 1
  loop
    v_body := r.content::jsonb;
    if v_body ? 'rates' and v_body ->> 'base' = 'MXN' then
      v_date := (v_body ->> 'date')::date;
      for k in select jsonb_object_keys(v_body -> 'rates') loop
        insert into fx_rates (base, quote, rate, as_of, updated_at)
        values ('MXN', k, (v_body -> 'rates' ->> k)::numeric, v_date, now())
        on conflict (base, quote) do update
          set rate = excluded.rate, as_of = excluded.as_of, updated_at = now();
        v_count := v_count + 1;
      end loop;
    end if;
  end loop;
  return v_count;
end $$;

revoke execute on function public.fx_request() from public, anon, authenticated;
revoke execute on function public.fx_collect() from public, anon, authenticated;
grant execute on function public.fx_request() to service_role;
grant execute on function public.fx_collect() to service_role;

-- 13:10 UTC dispara; 13:15 recoge. Cinco minutos sobran para una respuesta.
select cron.schedule('millions-fx-request', '10 13 * * *', $job$select public.fx_request()$job$);
select cron.schedule('millions-fx-collect', '15 13 * * *', $job$select public.fx_collect()$job$);
