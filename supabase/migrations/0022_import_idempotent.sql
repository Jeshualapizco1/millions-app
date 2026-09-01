-- ============================================================================
-- Millions v2 — importar dos veces no duplica
--
-- import_transactions insertaba cada fila a ciegas: si la respuesta se perdia
-- a mitad de camino y la persona volvia a tocar "Importar", entraban hasta
-- 2000 movimientos repetidos y su saldo dos veces. apply_transaction ya
-- resolvia esto con p_client_id; aqui es lo mismo, por fila.
--
-- Cada fila puede traer `id`. Si viene y ya existe, la fila se salta SIN
-- tocar el saldo: `on conflict (id) do nothing` y se mira row_count antes de
-- sumar. Si no viene, se genera uno, como antes. El cliente manda un id
-- determinista (hash de cuenta + fecha + monto + descripcion + posicion),
-- asi que el mismo archivo importado dos veces entra una sola.
--
-- Todo lo demas (fechas en la zona de la persona, validaciones) queda igual
-- que en la 0020.
-- ============================================================================

create or replace function public.import_transactions(p_rows jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  v_uid uuid := auth.uid();
  v_tz text;
  v_total int := 0;
  v_account uuid;
  v_kind public.tx_kind;
  v_amount numeric;
  v_date_txt text;
  v_date timestamptz;
  v_id uuid;
  v_ins int;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Se esperaba un arreglo'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'Máximo 2000 movimientos por importación'; end if;

  select coalesce(timezone, 'America/Mazatlan') into v_tz from profiles where id = v_uid;
  v_tz := coalesce(v_tz, 'America/Mazatlan');

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

    -- Fecha sin hora → mediodia en la zona de la persona. Con hora y zona → tal cual.
    v_date_txt := r ->> 'date';
    if v_date_txt is null or v_date_txt = '' then
      v_date := now();
    elsif length(v_date_txt) <= 10 then
      v_date := (v_date_txt::date::timestamp + interval '12 hours') at time zone v_tz;
    else
      v_date := v_date_txt::timestamptz;
    end if;

    v_id := coalesce(nullif(r ->> 'id', '')::uuid, gen_random_uuid());

    insert into transactions (id, user_id, account_id, kind, amount, description, category_id, date, notes)
    values (
      v_id, v_uid, v_account, v_kind, v_amount,
      coalesce(r ->> 'description', 'Importado'),
      nullif(r ->> 'category_id', '')::uuid,
      v_date,
      r ->> 'notes'
    )
    on conflict (id) do nothing;

    -- Solo si de verdad entro se mueve el saldo: un reintento no suma dos veces.
    get diagnostics v_ins = row_count;
    if v_ins = 1 then
      update accounts set balance = balance + tx_delta(v_kind, v_amount)
      where id = v_account and user_id = v_uid;
      v_total := v_total + 1;
    end if;
  end loop;

  return v_total;
end $$;
