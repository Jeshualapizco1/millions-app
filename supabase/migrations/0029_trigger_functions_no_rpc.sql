-- ============================================================================
-- Millions v2 — B15: las funciones de trigger dejan de colgar de la API
--
-- `validate_transaction_refs()`, `reject_archived_account()` y
-- `pause_rules_of_archived_account()` son SECURITY DEFINER y viven en
-- `public`, asi que PostgREST las publica en `/rest/v1/rpc/...` para `anon` y
-- para `authenticated`. El advisor de seguridad las marca por eso.
--
-- Llamarlas sueltas revienta —fuera de un trigger no existe `new`— pero una
-- funcion con los privilegios de su dueno colgando de la API publica no se
-- deja ahi: hoy falla, y manana alguien le agrega una rama que no dependa de
-- `new` y se convierte en una puerta.
--
-- **Por que aqui solo se revoca el EXECUTE y no se pasan a INVOKER**, que fue
-- lo que se hizo en la 0028: aquella funcion solo hacia `new.updated_at :=
-- now()` y no consultaba nada, asi que el cambio no tenia consecuencias.
-- Estas tres SI leen tablas con RLS —`accounts`, `categories`,
-- `recurring_rules`, `credits`, `goals`— y como INVOKER pasarian a ver
-- unicamente lo que el usuario puede ver. En el caso normal daria igual,
-- porque los datos son suyos; pero son validaciones de seguridad, cambiarlas
-- es cambiar lo que bloquean, y con la base sin datos no hay forma de
-- comprobarlo. Se deja para cuando haya con que probarlo.
--
-- Revocar el EXECUTE no apaga los triggers: PostgreSQL comprueba ese permiso
-- al CREAR el trigger, no al dispararlo. Verificado contra esta misma base
-- antes de escribir la migracion, con la 0028 ya aplicada: un update sobre
-- `subscriptions` sigue actualizando `updated_at` aunque su funcion ya no
-- tenga EXECUTE para nadie.
-- ============================================================================

revoke all on function public.validate_transaction_refs()
  from public, anon, authenticated;
revoke all on function public.reject_archived_account()
  from public, anon, authenticated;
revoke all on function public.pause_rules_of_archived_account()
  from public, anon, authenticated;

comment on function public.validate_transaction_refs() is
  'Trigger de transactions: las referencias son del mismo dueno. Sin EXECUTE para nadie, solo lo dispara la tabla.';
comment on function public.reject_archived_account() is
  'Trigger de transactions: no se registra en una cuenta archivada. Sin EXECUTE para nadie, solo lo dispara la tabla.';
comment on function public.pause_rules_of_archived_account() is
  'Trigger de accounts: archivar una cuenta pausa sus fijos. Sin EXECUTE para nadie, solo lo dispara la tabla.';
