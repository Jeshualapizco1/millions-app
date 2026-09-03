-- ============================================================================
-- Millions v2 — el trigger de `subscriptions` deja de ser una RPC publica
--
-- La 0027 declaro `touch_subscriptions_updated_at()` como SECURITY DEFINER,
-- copiando el patron de otras funciones del esquema. Fue un error de bulto:
-- una funcion de trigger que solo hace `new.updated_at := now()` no necesita
-- privilegios prestados, y al ser DEFINER y vivir en `public` quedo publicada
-- en `/rest/v1/rpc/touch_subscriptions_updated_at` para `anon` y para
-- `authenticated`. El advisor de seguridad la marco dos veces.
--
-- Llamarla suelta no hace dano —fuera de un trigger no hay `new`, asi que
-- revienta— pero una funcion con privilegios de su dueno colgando de la API
-- publica es exactamente lo que no se debe dejar ahi.
--
-- Se queda como SECURITY INVOKER, que es lo que un trigger necesita, y se le
-- retira el EXECUTE a todo el mundo salvo al dueno.
-- ============================================================================

create or replace function public.touch_subscriptions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- `public` incluye a anon y a authenticated: sin esto la funcion sigue
-- apareciendo en la API aunque ya no sea DEFINER.
revoke all on function public.touch_subscriptions_updated_at() from public, anon, authenticated;

comment on function public.touch_subscriptions_updated_at() is
  'Trigger de subscriptions. INVOKER y sin EXECUTE para nadie: solo lo dispara la tabla, nunca se llama por RPC.';
