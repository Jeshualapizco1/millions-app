-- ============================================================================
-- Millions v2 — registro de errores del cliente
-- Los fallos que hoy mueren en console.error quedan aqui, en la propia base
-- del usuario. Sin servicios de terceros y dentro del plan Free.
-- (Aplicada al proyecto el 2026-08-30 via MCP.)
-- ============================================================================

create table public.client_errors (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  message     text not null,
  stack       text,
  -- Donde ocurrio: ruta, pestaña, accion, navegador, version desplegada
  context     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index client_errors_user_time_idx on public.client_errors (user_id, created_at desc);

alter table public.client_errors enable row level security;
alter table public.client_errors force row level security;

-- El usuario escribe y lee los suyos. No se editan ni se borran desde la app:
-- un registro de fallos que se puede reescribir no sirve para diagnosticar.
create policy client_errors_insert_own on public.client_errors
  for insert to authenticated with check (user_id = auth.uid());
create policy client_errors_read_own on public.client_errors
  for select to authenticated using (user_id = auth.uid());

-- Retencion: 60 dias. Sin esto la tabla crece para siempre sin que nadie mire.
create or replace function public.purge_client_errors()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  delete from client_errors where created_at < now() - interval '60 days';
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.purge_client_errors() from public, anon, authenticated;
grant execute on function public.purge_client_errors() to service_role;

select cron.schedule('millions-purge-errors', '30 13 * * 0', $job$select public.purge_client_errors()$job$);
