-- ============================================================================
-- Millions v2 — recurrentes e importaciones con la fecha del usuario
--
-- run_recurring_rules escribia `v_next::timestamptz`: un DATE casteado en la
-- sesion del cron, que corre en UTC. La renta del dia 1 quedaba grabada a
-- medianoche UTC, que en Mazatlan es el 31 a las 17:00 — un mes antes, para
-- presupuestos, graficas y el asesor.
--
-- Ahora la fecha se ancla al MEDIODIA en la zona de la persona
-- (profiles.timezone). Mediodia y no medianoche: un movimiento fijo no tiene
-- hora, y el mediodia mantiene el dia local en cualquier zona aunque haya
-- cambio de horario. Es lo mismo que ya hacia chat.ts al leer next_run
-- (`${next_run}T12:00:00`).
--
-- De paso, aislamiento por regla (B10): una excepcion en una regla ya no
-- aborta el job para todos los usuarios, y `for update skip locked` evita
-- que dos corridas se pisen si el cron y un "ejecutar ahora" coinciden.
--
-- import_transactions: el cliente manda un ISO completo con zona, que se
-- castea bien. Pero si llega una fecha sin hora ("2026-09-05") se interpretaba
-- a medianoche UTC. Ahora una fecha sin hora se ancla igual, al mediodia local.
-- ============================================================================

create or replace function public.run_recurring_rules()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_next date; v_guard int; v_total int := 0;
begin
  for r in
    select rr.*, coalesce(p.timezone, 'America/Mazatlan') as tz
      from recurring_rules rr
      left join profiles p on p.id = rr.user_id
     where rr.active and rr.next_run <= current_date
     for update of rr skip locked
  loop
    begin
      v_next := r.next_run;
      v_guard := 0;
      -- Genera TODAS las ocurrencias vencidas: si el job no corrio unos dias,
      -- al volver se ponen al corriente en vez de perderse.
      while v_next <= current_date and v_guard < 60 loop
        insert into transactions (user_id, account_id, kind, amount, description, category_id, date, recurring_id)
        values (
          r.user_id, r.account_id, r.kind, r.amount, r.name, r.category_id,
          (v_next::timestamp + interval '12 hours') at time zone r.tz,
          r.id
        );
        update accounts set balance = balance + tx_delta(r.kind, r.amount)
        where id = r.account_id and user_id = r.user_id;
        v_next := advance_date(v_next, r.frequency);
        v_guard := v_guard + 1;
        v_total := v_total + 1;
      end loop;
      update recurring_rules set next_run = v_next, last_run = current_date where id = r.id;
    exception when others then
      -- Una regla rota (cuenta borrada, zona invalida) no debe dejar sin su
      -- nomina a los demas. Queda en el log del cron y se reintenta mañana.
      raise warning 'run_recurring_rules: regla % (%) fallo: %', r.id, r.name, sqlerrm;
    end;
  end loop;
  return v_total;
end $$;

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

    insert into transactions (user_id, account_id, kind, amount, description, category_id, date, notes)
    values (
      v_uid, v_account, v_kind, v_amount,
      coalesce(r ->> 'description', 'Importado'),
      nullif(r ->> 'category_id', '')::uuid,
      v_date,
      r ->> 'notes'
    );

    update accounts set balance = balance + tx_delta(v_kind, v_amount)
    where id = v_account and user_id = v_uid;

    v_total := v_total + 1;
  end loop;

  return v_total;
end $$;
