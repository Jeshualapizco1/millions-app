-- ============================================================================
-- Millions v2 — importacion masiva de movimientos
-- Insertar N transacciones una por una serian N viajes y N updates de saldo.
-- Esto lo hace en una sola transaccion: o entra todo o no entra nada.
-- (Aplicada al proyecto el 2026-08-30 via MCP.)
-- ============================================================================

create or replace function public.import_transactions(p_rows jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  v_uid uuid := auth.uid();
  v_total int := 0;
  v_account uuid;
  v_kind public.tx_kind;
  v_amount numeric;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Se esperaba un arreglo'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'Máximo 2000 movimientos por importación'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_account := (r ->> 'account_id')::uuid;
    v_kind := (r ->> 'kind')::public.tx_kind;
    v_amount := (r ->> 'amount')::numeric;

    if v_kind not in ('gasto', 'ingreso') then
      raise exception 'Solo se importan gastos e ingresos';
    end if;
    if v_amount is null or v_amount <= 0 then
      raise exception 'Monto inválido en "%"', r ->> 'description';
    end if;

    if not exists (select 1 from accounts where id = v_account and user_id = v_uid) then
      raise exception 'La cuenta indicada no existe';
    end if;

    insert into transactions (user_id, account_id, kind, amount, description, category_id, date, notes)
    values (
      v_uid, v_account, v_kind, v_amount,
      coalesce(r ->> 'description', 'Importado'),
      nullif(r ->> 'category_id', '')::uuid,
      coalesce((r ->> 'date')::timestamptz, now()),
      r ->> 'notes'
    );

    update accounts set balance = balance + tx_delta(v_kind, v_amount)
    where id = v_account and user_id = v_uid;

    v_total := v_total + 1;
  end loop;

  return v_total;
end $$;

grant execute on function public.import_transactions(jsonb) to authenticated;
