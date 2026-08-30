-- ============================================================================
-- Millions v2 — cortes de patrimonio y presupuesto total mensual
-- (Aplicada al proyecto el 2026-08-30 vía MCP.)
-- ============================================================================

-- La tendencia de patrimonio se reconstruye desde los movimientos, asi que un
-- saldo ajustado a mano la desvia. Guardar el corte real cada mes la convierte
-- en historia registrada.
create table public.net_worth_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  taken_on    date not null default current_date,
  assets      numeric(14,2) not null,
  debt        numeric(14,2) not null,
  net         numeric(14,2) not null,
  created_at  timestamptz not null default now(),
  unique (user_id, taken_on)
);
create index net_worth_snapshots_user_idx on public.net_worth_snapshots (user_id, taken_on);

alter table public.net_worth_snapshots enable row level security;
alter table public.net_worth_snapshots force row level security;
create policy net_worth_snapshots_own on public.net_worth_snapshots
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Techo de gasto mensual global, ademas de los limites por categoria
alter table public.profiles add column monthly_budget numeric(14,2)
  check (monthly_budget is null or monthly_budget > 0);

create or replace function public.take_net_worth_snapshots()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with saldos as (
    select p.id as user_id,
           coalesce((select sum(balance) from accounts a where a.user_id = p.id and a.archived_at is null), 0) as assets,
           coalesce((select sum(total_debt) from credits c where c.user_id = p.id and c.archived_at is null), 0) as debt
    from profiles p
  )
  insert into net_worth_snapshots (user_id, taken_on, assets, debt, net)
  select user_id, current_date, assets, debt, assets - debt from saldos
  on conflict (user_id, taken_on) do update
    set assets = excluded.assets, debt = excluded.debt, net = excluded.net;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.take_net_worth_snapshots() from public, anon, authenticated;
grant execute on function public.take_net_worth_snapshots() to service_role;

-- Ultimo dia de cada mes a las 13:05 UTC (6:05 AM Mazatlan), justo despues
-- del job de recurrentes para que el corte incluya lo que se genero ese dia.
select cron.schedule(
  'millions-net-worth',
  '5 13 28-31 * *',
  $job$select case when current_date = (date_trunc('month', current_date) + interval '1 month - 1 day')::date
                   then public.take_net_worth_snapshots() else 0 end$job$
);
