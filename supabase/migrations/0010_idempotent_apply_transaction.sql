-- ============================================================================
-- Millions v2 — registro idempotente
-- La cola offline reintenta lo que no pudo enviarse. Si un reintento ocurre
-- despues de que el servidor SI recibio el original (respuesta perdida por la
-- red), sin esto se duplicaria el movimiento y el saldo.
-- Con p_client_id el cliente decide el id: el segundo intento no hace nada.
-- (Aplicada al proyecto el 2026-08-30 via MCP.)
-- ============================================================================

create or replace function public.apply_transaction(
  p_account_id  uuid,
  p_kind        public.tx_kind,
  p_amount      numeric,
  p_description text,
  p_category_id uuid default null,
  p_date        timestamptz default now(),
  p_notes       text default null,
  p_recurring_id uuid default null,
  p_client_id   uuid default null
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare
  v_tx public.transactions;
  v_id uuid := coalesce(p_client_id, gen_random_uuid());
begin
  if p_kind not in ('gasto', 'ingreso') then
    raise exception 'apply_transaction solo acepta gasto o ingreso';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  -- Ya llego antes: se devuelve tal cual, sin volver a tocar el saldo.
  select * into v_tx from transactions where id = v_id and user_id = auth.uid();
  if found then return v_tx; end if;

  insert into transactions (id, user_id, account_id, kind, amount, description, category_id, date, notes, recurring_id)
  values (v_id, auth.uid(), p_account_id, p_kind, p_amount, p_description, p_category_id, p_date, p_notes, p_recurring_id)
  returning * into v_tx;

  update accounts set balance = balance + tx_delta(p_kind, p_amount)
  where id = p_account_id and user_id = auth.uid();
  if not found then raise exception 'Cuenta no encontrada'; end if;

  return v_tx;
end $$;

grant execute on function public.apply_transaction(uuid, public.tx_kind, numeric, text, uuid, timestamptz, text, uuid, uuid) to authenticated;
