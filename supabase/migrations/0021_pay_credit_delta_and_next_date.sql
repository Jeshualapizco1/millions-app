-- ============================================================================
-- Millions v2 — pagar un credito: lo que de verdad bajo, y la siguiente fecha
--
-- Dos bugs en pay_credit / reverse_transaction:
--
--   1. Sobrepago. pay_credit recortaba la deuda con greatest(total_debt -
--      monto, 0), pero reverse_transaction sumaba el monto COMPLETO. Pagar
--      5,000 a una deuda de 2,200 y deshacerlo dejaba la deuda en 7,200.
--      Ahora credit_payments guarda debt_delta — cuanto bajo la deuda de
--      verdad — y la reversion suma eso. El sobrepago se sigue aceptando: la
--      deuda registrada puede ir atrasada respecto al banco (intereses que
--      nadie capturo) y rechazar el pago dejaria a la persona sin registrar
--      dinero que si salio de su cuenta.
--
--   2. La fecha de proximo pago no avanzaba nunca. Un credito con
--      next_payment_date se marcaba "¡Vencido!" el dia despues de la fecha y
--      pagar no lo quitaba: no habia nada que moviera la fecha. Ahora pagar
--      la avanza a la siguiente ocurrencia — el payment_day del mes que sigue
--      si lo hay, o un mes despues si no — siempre estrictamente despues de
--      la fecha actual y de la del pago. Dos pagos en el mismo mes avanzan
--      dos veces; la fecha es editable en el formulario y ese caso es raro.
--      La fecha anterior se guarda en credit_payments para que deshacer el
--      pago la devuelva.
--
-- El dia del pago se toma en la zona de la persona (profiles.timezone), no
-- en la del servidor, igual que en la 0020.
-- ============================================================================

alter table public.credit_payments
  add column if not exists debt_delta numeric(14,2),
  add column if not exists prev_next_payment_date date;

comment on column public.credit_payments.debt_delta is
  'Cuanto bajo total_debt con este pago. Menor que amount si se pago de mas.';
comment on column public.credit_payments.prev_next_payment_date is
  'next_payment_date del credito antes de este pago, para devolverla al revertir. Null si el pago no la movio.';

-- Historial previo: no hay mejor dato que el monto.
update public.credit_payments set debt_delta = amount where debt_delta is null;

create or replace function public.pay_credit(
  p_credit_id  uuid,
  p_account_id uuid,
  p_amount     numeric,
  p_date       timestamptz default now()
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare
  v_tx      public.transactions;
  v_credit  public.credits;
  v_tz      text;
  v_delta   numeric;
  v_hoy     date;
  v_base    date;
  v_next    date;
  v_prev    date;
  v_guard   int := 0;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select * into v_credit from credits where id = p_credit_id and user_id = auth.uid();
  if not found then raise exception 'Crédito no encontrado'; end if;

  insert into transactions (user_id, account_id, kind, amount, description, date, credit_id)
  values (auth.uid(), p_account_id, 'pago_credito', p_amount, 'Pago a ' || v_credit.name, p_date, p_credit_id)
  returning * into v_tx;

  update accounts set balance = balance - p_amount
  where id = p_account_id and user_id = auth.uid();
  if not found then raise exception 'Cuenta no encontrada'; end if;

  -- La deuda no baja de cero; lo que si bajo se guarda para poder revertirlo.
  v_delta := least(p_amount, v_credit.total_debt);
  update credits set total_debt = total_debt - v_delta
  where id = p_credit_id and user_id = auth.uid();

  -- Siguiente fecha de pago, si el credito lleva una.
  if v_credit.next_payment_date is not null then
    select coalesce(timezone, 'America/Mazatlan') into v_tz from profiles where id = auth.uid();
    v_hoy  := (p_date at time zone coalesce(v_tz, 'America/Mazatlan'))::date;
    v_base := greatest(v_credit.next_payment_date, v_hoy);
    v_prev := v_credit.next_payment_date;

    if v_credit.payment_day is not null then
      -- El payment_day de este mes o del siguiente, recortado al ultimo dia
      -- del mes (dia 31 en septiembre cae el 30), estrictamente despues de la base.
      v_next := make_date(extract(year from v_base)::int, extract(month from v_base)::int, 1);
      v_next := v_next + (least(v_credit.payment_day, extract(day from (v_next + interval '1 month - 1 day'))::int) - 1);
      if v_next <= v_base then
        v_next := (date_trunc('month', v_base) + interval '1 month')::date;
        v_next := v_next + (least(v_credit.payment_day, extract(day from (v_next + interval '1 month - 1 day'))::int) - 1);
      end if;
    else
      v_next := v_credit.next_payment_date;
      while v_next <= v_base and v_guard < 24 loop
        v_next := advance_date(v_next, 'mensual');
        v_guard := v_guard + 1;
      end loop;
    end if;

    update credits set next_payment_date = v_next
    where id = p_credit_id and user_id = auth.uid();
  end if;

  insert into credit_payments (user_id, credit_id, account_id, transaction_id, amount, paid_at, debt_delta, prev_next_payment_date)
  values (auth.uid(), p_credit_id, p_account_id, v_tx.id, p_amount, p_date, v_delta, v_prev);

  return v_tx;
end $$;

create or replace function public.reverse_transaction(p_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_tx   public.transactions;
  v_pago public.credit_payments;
begin
  select * into v_tx from transactions where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Transacción no encontrada'; end if;

  -- revertir el efecto sobre la cuenta origen
  update accounts set balance = balance - tx_delta(v_tx.kind, v_tx.amount)
  where id = v_tx.account_id and user_id = auth.uid();

  if v_tx.kind = 'transferencia' then
    -- y quitar lo que sumó al destino
    update accounts set balance = balance - v_tx.amount
    where id = v_tx.to_account_id and user_id = auth.uid();
  end if;

  if v_tx.kind = 'pago_credito' then
    select * into v_pago from credit_payments where transaction_id = v_tx.id and user_id = auth.uid();
    -- Se devuelve lo que de verdad bajo, no el monto: un sobrepago revertido
    -- ya no infla la deuda. Y la fecha de pago vuelve a donde estaba.
    update credits
       set total_debt = total_debt + coalesce(v_pago.debt_delta, v_tx.amount),
           next_payment_date = coalesce(v_pago.prev_next_payment_date, next_payment_date)
     where id = v_tx.credit_id and user_id = auth.uid();
    delete from credit_payments where transaction_id = v_tx.id and user_id = auth.uid();
  elsif v_tx.kind = 'abono_meta' then
    update goals set current_amount = greatest(current_amount - v_tx.amount, 0), completed_at = null
    where id = v_tx.goal_id and user_id = auth.uid();
    delete from goal_contributions where transaction_id = v_tx.id and user_id = auth.uid();
  end if;

  delete from transactions where id = v_tx.id and user_id = auth.uid();
end $$;
