-- ============================================================================
-- Millions v2 — marco legal y borrado de cuenta
--
-- Dos cosas que la ley mexicana exige antes de abrir el registro al publico:
--
-- 1. Constancia de que la persona acepto el aviso de privacidad y los
--    terminos. Se guarda la FECHA y la VERSION: si el aviso cambia, la
--    version deja de coincidir y la app vuelve a pedir la aceptacion. Sin
--    version, un cambio de texto haria que la constancia dijera que aceptaron
--    algo que nunca leyeron.
--
-- 2. Derecho de cancelacion (la "C" de ARCO). Se hace con 30 dias de gracia:
--    la cuenta sigue usable y la persona puede arrepentirse; pasados los 30
--    dias un cron la borra de auth.users y las 12 tablas caen solas por
--    ON DELETE CASCADE.
-- ============================================================================

alter table public.profiles
  add column if not exists legal_accepted_at     timestamptz,
  add column if not exists legal_version         text,
  add column if not exists deletion_requested_at timestamptz;

comment on column public.profiles.legal_version is
  'Version del aviso/terminos aceptada. Si no coincide con la vigente, se vuelve a pedir.';
comment on column public.profiles.deletion_requested_at is
  'Momento en que se pidio borrar la cuenta. El purgado corre 30 dias despues.';

-- ── Alta de usuario ─────────────────────────────────────────────────────────
-- La casilla se marca en el registro, antes de que exista la fila de profiles,
-- asi que viaja en el metadata del signUp y el trigger la aterriza. La fecha
-- la pone el servidor con now(): si viniera del cliente seria falsificable, y
-- una constancia de consentimiento falsificable no sirve de nada.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_legal text := new.raw_user_meta_data ->> 'legal_version';
begin
  insert into public.profiles (id, name, legal_version, legal_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    v_legal,
    case when v_legal is null then null else now() end
  );

  insert into public.categories (user_id, name, icon, color, kind, sort_order) values
    (new.id, 'Alimentación',   '🍔', '#f97316', 'gasto',   1),
    (new.id, 'Transporte',     '🚗', '#3b82f6', 'gasto',   2),
    (new.id, 'Salud',          '💊', '#ec4899', 'gasto',   3),
    (new.id, 'Educación',      '📚', '#0ea5e9', 'gasto',   4),
    (new.id, 'Entretenimiento','🎬', '#a855f7', 'gasto',   5),
    (new.id, 'Servicios',      '💡', '#eab308', 'gasto',   6),
    (new.id, 'Compras',        '🛍️', '#06b6d4', 'gasto',   7),
    (new.id, 'Nómina',         '💼', '#10b981', 'ingreso', 8),
    (new.id, 'Ventas',         '🌸', '#4ade80', 'ingreso', 9),
    (new.id, 'Transferencia',  '↔️', '#8b5cf6', 'ambos',  10),
    (new.id, 'Otros',          '📦', '#6b7280', 'ambos',  11);
  return new;
end $$;

-- ── Aceptar el aviso y los terminos ─────────────────────────────────────────
-- Existe como RPC y no como un update directo para que la FECHA la ponga
-- Postgres. Con un update el cliente elegiria su propio legal_accepted_at.
create or replace function public.accept_legal(p_version text)
returns timestamptz language plpgsql security invoker set search_path = public as $$
declare v_now timestamptz := now();
begin
  if p_version is null or length(trim(p_version)) = 0 then
    raise exception 'Falta la version del aviso';
  end if;
  update profiles
     set legal_version = p_version, legal_accepted_at = v_now
   where id = auth.uid();
  return v_now;
end $$;

-- ── Cancelacion de cuenta (derecho ARCO) ────────────────────────────────────
create or replace function public.request_account_deletion()
returns timestamptz language plpgsql security invoker set search_path = public as $$
begin
  -- Si ya habia una solicitud, se respeta la original: volver a pedirlo no
  -- reinicia el reloj de los 30 dias.
  update profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
   where id = auth.uid();
  return (select deletion_requested_at from profiles where id = auth.uid());
end $$;

create or replace function public.cancel_account_deletion()
returns void language sql security invoker set search_path = public as $$
  update profiles set deletion_requested_at = null where id = auth.uid();
$$;

-- ── Purgado: lo unico que borra de verdad ───────────────────────────────────
-- SECURITY DEFINER porque borrar de auth.users esta fuera del alcance de
-- authenticated. Nadie mas que el cron puede ejecutarla.
create or replace function public.purge_deleted_accounts()
returns integer language plpgsql security definer set search_path = public, auth as $$
declare v_total integer := 0;
begin
  with vencidas as (
    select id from public.profiles
     where deletion_requested_at is not null
       and deletion_requested_at < now() - interval '30 days'
  )
  delete from auth.users u using vencidas v where u.id = v.id;
  get diagnostics v_total = row_count;
  return v_total;
end $$;

revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;
grant  execute on function public.purge_deleted_accounts() to service_role;
grant  execute on function public.accept_legal(text)         to authenticated;
grant  execute on function public.request_account_deletion() to authenticated;
grant  execute on function public.cancel_account_deletion()  to authenticated;

-- 13:30 UTC = 6:30 AM en Mazatlan, media hora despues de los recurrentes.
select cron.schedule('millions-purge-accounts', '30 13 * * *', $job$select public.purge_deleted_accounts()$job$);
