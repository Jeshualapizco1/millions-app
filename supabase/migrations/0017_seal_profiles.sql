-- ============================================================================
-- Millions v2 — sellar las columnas de profiles que el cliente no debe tocar
--
-- Hasta hoy `authenticated` tenia UPDATE sobre TODAS las columnas de profiles
-- y RLS solo limita a la fila propia. Es decir: cualquiera podia escribir su
-- propio legal_accepted_at, legal_version u onboarded_at, o poner
-- deletion_requested_at 31 dias atras para que el cron lo borrara manana.
-- Las RPC de 0014 y 0015 existian justo para que la FECHA la pusiera
-- Postgres — pero un update directo por PostgREST les daba la vuelta.
--
-- Dos cosas en una sola migracion, porque no sirven por separado:
--
--   1. Las RPC que escriben columnas selladas pasan a SECURITY DEFINER. Eran
--      SECURITY INVOKER, asi que con el privilegio revocado dejarian de
--      funcionar y el porton legal bloquearia a todo el mundo. Siguen
--      filtrando por auth.uid() y ahora ademas exigen sesion: como definer,
--      un auth.uid() nulo no debe convertirse en un UPDATE que no hace nada
--      en silencio.
--
--   2. authenticated pierde todo sobre profiles y recupera solo SELECT y
--      UPDATE de las cuatro columnas que el cliente edita de verdad. INSERT lo
--      hace el trigger handle_new_user (definer); DELETE llega por cascada
--      desde auth.users; nadie del lado del cliente necesita ninguno de los dos.
--
-- Tambien cierra a `anon` las tres RPC de 0014, que se aplico suelta y sin
-- el revoke que si llevan 0015 y 0016.
-- ============================================================================

-- ── 1. RPC como SECURITY DEFINER ─────────────────────────────────────────────

create or replace function public.accept_legal(p_version text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_version is null or length(trim(p_version)) = 0 then
    raise exception 'Falta la version del aviso';
  end if;
  update public.profiles
     set legal_version = p_version, legal_accepted_at = v_now
   where id = auth.uid();
  return v_now;
end $$;

create or replace function public.request_account_deletion()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  -- Si ya habia una solicitud, se respeta la original: volver a pedirlo no
  -- reinicia el reloj de los 30 dias.
  update public.profiles
     set deletion_requested_at = coalesce(deletion_requested_at, now())
   where id = auth.uid()
  returning deletion_requested_at into v_at;
  return v_at;
end $$;

create or replace function public.cancel_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  update public.profiles set deletion_requested_at = null where id = auth.uid();
end $$;

create or replace function public.complete_onboarding()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  -- Idempotente: volver a llamarla no corre la fecha hacia adelante.
  update public.profiles
     set onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid()
  returning onboarded_at into v_at;

  if v_at is null then
    raise exception 'No hay perfil para el usuario en sesion';
  end if;
  return v_at;
end $$;

-- Solo quien tiene sesion. `create or replace` conserva los grants previos, y
-- los de 0014 incluian a anon por omision: se cierran aqui.
revoke all on function public.accept_legal(text) from public, anon;
revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
revoke all on function public.complete_onboarding() from public, anon;
grant execute on function public.accept_legal(text) to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.complete_onboarding() to authenticated;

-- ── 2. Privilegios por columna en profiles ──────────────────────────────────

revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, base_currency, timezone, monthly_budget) on public.profiles to authenticated;

-- Verificacion (debe devolver exactamente esas cuatro columnas para UPDATE):
--   select privilege_type, string_agg(column_name, ',' order by column_name)
--     from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
--    group by privilege_type;
