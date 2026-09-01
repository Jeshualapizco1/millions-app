-- ============================================================================
-- Millions v2 — arranque guiado
--
-- Hasta ahora un usuario nuevo caia en un tablero vacio: sin cuentas no hay
-- saldo, sin saldo no hay patrimonio, sin movimientos fijos no hay proyeccion
-- de cierre. Media app apagada por falta de configuracion, no de funciones.
--
-- Una sola columna decide si el arranque se muestra. Vive en la base y no en
-- el navegador porque cambiar de telefono no deberia volver a preguntar lo
-- mismo, y porque el dia que haya panel de uso, "cuantos terminaron el
-- arranque" es justo la cifra que se va a querer mirar.
-- ============================================================================

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'Cuando se termino (o se salto) el arranque guiado. Null = nunca se ha visto.';

-- Las cuentas que ya existian no deben ver el arranque: ya tienen su app
-- montada. Se les marca como hechas. Quien no tenga ni una cuenta lo vera la
-- proxima vez que entre, que es exactamente a quien esta dirigido.
update public.profiles p
   set onboarded_at = p.created_at
 where p.onboarded_at is null
   and exists (select 1 from public.accounts a where a.user_id = p.id);

-- ── Marcar el arranque como terminado ───────────────────────────────────────
-- La fecha la pone Postgres, igual que la del aviso legal: el cliente no
-- decide cuando ocurrieron las cosas. Y es idempotente — volver a llamarla no
-- corre la fecha hacia adelante, porque entonces dejaria de decir cuando fue.
create or replace function public.complete_onboarding()
returns timestamptz language plpgsql security invoker set search_path = public as $$
declare v_at timestamptz;
begin
  update public.profiles
     set onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid()
  returning onboarded_at into v_at;

  if v_at is null then
    raise exception 'No hay perfil para el usuario en sesion';
  end if;
  return v_at;
end $$;

revoke all on function public.complete_onboarding() from public, anon;
grant execute on function public.complete_onboarding() to authenticated;
