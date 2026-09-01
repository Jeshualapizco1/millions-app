-- ============================================================================
-- Millions v2 — cuatro bugs bajos que viven en la base
--
-- C7. `transfer` movia UNIDADES entre monedas distintas: 100 de una cuenta en
--     dolares "llegaban" como 100 pesos. Mientras el selector de moneda este
--     apagado (src/lib/currency.ts) nadie puede crear cuentas en otra moneda,
--     pero las que ya existen si pueden transferir. Se rechaza con un mensaje
--     claro en vez de mover dinero mal. Cuando las transacciones guarden su
--     moneda, esto se convierte en una conversion.
--
-- C8. `update_transaction` ponia notes y category_id en null cuando no venian:
--     editar el monto desde la app borraba la nota. Ahora se conservan si no
--     se mandan (la app no tiene UI para vaciarlas, asi que no se pierde nada).
--     Y `reverse_transaction` borraba completed_at de la meta aunque siguiera
--     cumplida: deshacer un abono de 100 en una meta rebasada por 5,000 la
--     descompletaba. Ahora se recalcula contra el objetivo.
--
-- C9. Ni apply_transaction ni import_transactions comprobaban que
--     p_category_id / p_recurring_id fueran del usuario. La FK solo exige que
--     existan, asi que con un uuid ajeno se podia etiquetar un movimiento
--     propio con la categoria de otra persona (y leer su nombre por el join).
--     Un trigger lo cubre de una vez para todas las RPC, presentes y futuras.
--
-- C13. Una regla con next_run de hace anos generaba 60 filas por dia durante
--     meses: el tope por corrida existia, pero al dia siguiente seguia atras.
--     Ahora el catch-up tiene ventana de 90 dias; lo mas viejo se salta hacia
--     adelante y queda un aviso en el log del cron.
-- ============================================================================

-- ── C7: transferir entre monedas distintas ───────────────────────────────────
create or replace function public.transfer(
  p_from_account uuid,
  p_to_account   uuid,
  p_amount       numeric,
  p_description  text default 'Transferencia',
  p_date         timestamptz default now()
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare
  v_tx public.transactions;
  v_from public.accounts;
  v_to   public.accounts;
begin
  if p_from_account = p_to_account then raise exception 'Las cuentas deben ser distintas'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select * into v_from from accounts where id = p_from_account and user_id = auth.uid();
  if not found then raise exception 'Cuenta origen no encontrada'; end if;
  select * into v_to from accounts where id = p_to_account and user_id = auth.uid();
  if not found then raise exception 'Cuenta destino no encontrada'; end if;

  if coalesce(v_from.currency, 'MXN') <> coalesce(v_to.currency, 'MXN') then
    raise exception 'Por ahora solo se transfiere entre cuentas en la misma moneda (% y %)',
      v_from.currency, v_to.currency;
  end if;

  update accounts set balance = balance - p_amount where id = p_from_account and user_id = auth.uid();
  update accounts set balance = balance + p_amount where id = p_to_account and user_id = auth.uid();

  insert into transactions (user_id, account_id, to_account_id, kind, amount, description, date)
  values (auth.uid(), p_from_account, p_to_account, 'transferencia', p_amount, p_description, p_date)
  returning * into v_tx;

  return v_tx;
end $$;

-- ── C9: las referencias de un movimiento son del mismo dueño ─────────────────
create or replace function public.validate_transaction_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null
     and not exists (select 1 from categories where id = new.category_id and user_id = new.user_id) then
    raise exception 'Esa categoría no es tuya';
  end if;
  if new.recurring_id is not null
     and not exists (select 1 from recurring_rules where id = new.recurring_id and user_id = new.user_id) then
    raise exception 'Ese movimiento fijo no es tuyo';
  end if;
  if new.credit_id is not null
     and not exists (select 1 from credits where id = new.credit_id and user_id = new.user_id) then
    raise exception 'Ese crédito no es tuyo';
  end if;
  if new.goal_id is not null
     and not exists (select 1 from goals where id = new.goal_id and user_id = new.user_id) then
    raise exception 'Esa meta no es tuya';
  end if;
  return new;
end $$;

drop trigger if exists transactions_own_refs on public.transactions;
create trigger transactions_own_refs
  before insert or update on public.transactions
  for each row execute function public.validate_transaction_refs();

-- ── C8a: editar no borra la nota ni la categoría ─────────────────────────────
create or replace function public.update_transaction(
  p_id          uuid,
  p_account_id  uuid,
  p_kind        public.tx_kind,
  p_amount      numeric,
  p_description text,
  p_category_id uuid default null,
  p_date        timestamptz default null,
  p_notes       text default null
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare v_old public.transactions;
declare v_new public.transactions;
begin
  select * into v_old from transactions where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Transacción no encontrada'; end if;
  if v_old.kind not in ('gasto', 'ingreso') or p_kind not in ('gasto', 'ingreso') then
    raise exception 'Solo gastos e ingresos se editan; transferencias, pagos y abonos se revierten y recrean';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  -- revertir efecto viejo, aplicar el nuevo
  update accounts set balance = balance - tx_delta(v_old.kind, v_old.amount)
  where id = v_old.account_id and user_id = auth.uid();

  update accounts set balance = balance + tx_delta(p_kind, p_amount)
  where id = p_account_id and user_id = auth.uid();
  if not found then raise exception 'Cuenta no encontrada'; end if;

  -- Lo que no se manda se conserva: la app edita monto, cuenta y descripción
  -- sin tocar la nota, y antes eso la borraba.
  update transactions
  set account_id = p_account_id, kind = p_kind, amount = p_amount,
      description = p_description,
      category_id = coalesce(p_category_id, category_id),
      date = coalesce(p_date, date),
      notes = coalesce(p_notes, notes)
  where id = p_id and user_id = auth.uid()
  returning * into v_new;

  return v_new;
end $$;

-- ── C8b: deshacer un abono no descompleta una meta que sigue cumplida ────────
create or replace function public.reverse_transaction(p_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_tx   public.transactions;
  v_pago public.credit_payments;
begin
  select * into v_tx from transactions where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Transacción no encontrada'; end if;

  update accounts set balance = balance - tx_delta(v_tx.kind, v_tx.amount)
  where id = v_tx.account_id and user_id = auth.uid();

  if v_tx.kind = 'transferencia' then
    update accounts set balance = balance - v_tx.amount
    where id = v_tx.to_account_id and user_id = auth.uid();
  end if;

  if v_tx.kind = 'pago_credito' then
    select * into v_pago from credit_payments where transaction_id = v_tx.id and user_id = auth.uid();
    -- Se devuelve lo que de verdad bajó, no el monto: un sobrepago revertido
    -- ya no infla la deuda. Y la fecha de pago vuelve a donde estaba.
    update credits
       set total_debt = total_debt + coalesce(v_pago.debt_delta, v_tx.amount),
           next_payment_date = coalesce(v_pago.prev_next_payment_date, next_payment_date)
     where id = v_tx.credit_id and user_id = auth.uid();
    delete from credit_payments where transaction_id = v_tx.id and user_id = auth.uid();
  elsif v_tx.kind = 'abono_meta' then
    -- completed_at se recalcula: si tras quitar el abono la meta sigue
    -- alcanzada, sigue completa. Antes se borraba siempre.
    update goals
       set current_amount = greatest(current_amount - v_tx.amount, 0),
           completed_at = case
             when greatest(current_amount - v_tx.amount, 0) >= target_amount then coalesce(completed_at, now())
             else null
           end
     where id = v_tx.goal_id and user_id = auth.uid();
    delete from goal_contributions where transaction_id = v_tx.id and user_id = auth.uid();
  end if;

  delete from transactions where id = v_tx.id and user_id = auth.uid();
end $$;

-- ── C13: el catch-up tiene ventana ───────────────────────────────────────────
create or replace function public.run_recurring_rules()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_next date; v_guard int; v_total int := 0; v_saltadas int;
  c_ventana constant int := 90;
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
      v_saltadas := 0;

      -- Lo anterior a la ventana no se registra: una regla con fecha de hace
      -- anos generaria cientos de movimientos que nadie hizo. Se salta hacia
      -- adelante y queda constancia en el log.
      while v_next < current_date - c_ventana and v_saltadas < 2400 loop
        v_next := advance_date(v_next, r.frequency);
        v_saltadas := v_saltadas + 1;
      end loop;
      if v_saltadas > 0 then
        raise warning 'run_recurring_rules: regla % (%) venia % ocurrencias atrasadas; se saltaron las anteriores a % dias', r.id, r.name, v_saltadas, c_ventana;
      end if;

      -- Genera TODAS las ocurrencias vencidas dentro de la ventana: si el job
      -- no corrio unos dias, al volver se pone al corriente.
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
