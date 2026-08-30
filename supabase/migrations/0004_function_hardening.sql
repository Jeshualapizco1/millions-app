-- ============================================================================
-- Millions v2 — endurecimiento de funciones (hallazgos del advisor de Supabase)
-- 1. El grant implícito de EXECUTE a PUBLIC sobrevive al revoke de anon:
--    se revoca de PUBLIC y se re-otorga solo lo que el cliente debe llamar.
-- 2. handle_new_user es solo para el trigger de auth: nadie la llama por RPC.
-- 3. search_path fijo en las funciones que no lo tenían.
-- ============================================================================

-- Nadie llama funciones por defecto; se otorga explícitamente
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

-- Las RPC que el cliente autenticado sí usa
grant execute on function
  public.apply_transaction(uuid, public.tx_kind, numeric, text, uuid, timestamptz, text, uuid),
  public.transfer(uuid, uuid, numeric, text, timestamptz),
  public.pay_credit(uuid, uuid, numeric, timestamptz),
  public.contribute_goal(uuid, numeric, uuid, timestamptz),
  public.reverse_transaction(uuid),
  public.update_transaction(uuid, uuid, public.tx_kind, numeric, text, uuid, timestamptz, text),
  public.tx_delta(public.tx_kind, numeric)
to authenticated;

-- search_path fijo (advisor: function_search_path_mutable)
alter function public.set_updated_at() set search_path = public;
alter function public.tx_delta(public.tx_kind, numeric) set search_path = public;
