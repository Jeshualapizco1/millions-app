-- ============================================================================
-- Millions v2 — funciones atómicas (RPC)
-- Cada operación de dinero es UNA transacción de Postgres: inserta el
-- movimiento y ajusta saldos con balance = balance + delta. SECURITY INVOKER:
-- corren como el usuario autenticado, así que RLS aplica dentro de ellas.
-- El frontend nunca hace addTx + updateBalance por separado.
-- ============================================================================

-- Firma del delta que un movimiento aplica a su cuenta
create or replace function public.tx_delta(p_kind public.tx_kind, p_amount numeric)
returns numeric language sql immutable as $$
  select case p_kind
    when 'ingreso' then p_amount
    else -p_amount  -- gasto, transferencia (lado origen), pago_credito, abono_meta
  end
$$;

-- ── apply_transaction: gasto o ingreso simple ───────────────────────────────
create or replace function public.apply_transaction(
  p_account_id  uuid,
  p_kind        public.tx_kind,
  p_amount      numeric,
  p_description text,
  p_category_id uuid default null,
  p_date        timestamptz default now(),
  p_notes       text default null,
  p_recurring_id uuid default null
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare v_tx public.transactions;
begin
  if p_kind not in ('gasto', 'ingreso') then
    raise exception 'apply_transaction solo acepta gasto o ingreso';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  insert into transactions (user_id, account_id, kind, amount, description, category_id, date, notes, recurring_id)
  values (auth.uid(), p_account_id, p_kind, p_amount, p_description, p_category_id, p_date, p_notes, p_recurring_id)
  returning * into v_tx;

  update accounts set balance = balance + tx_delta(p_kind, p_amount)
  where id = p_account_id and user_id = auth.uid();
  if not found then raise exception 'Cuenta no encontrada'; end if;

  return v_tx;
end $$;

-- ── transfer: una fila, origen resta y destino suma ─────────────────────────
create or replace function public.transfer(
  p_from_account uuid,
  p_to_account   uuid,
  p_amount       numeric,
  p_description  text default 'Transferencia',
  p_date         timestamptz default now()
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare v_tx public.transactions;
begin
  if p_from_account = p_to_account then raise exception 'Las cuentas deben ser distintas'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  update accounts set balance = balance - p_amount
  where id = p_from_account and user_id = auth.uid();
  if not found then raise exception 'Cuenta origen no encontrada'; end if;

  update accounts set balance = balance + p_amount
  where id = p_to_account and user_id = auth.uid();
  if not found then raise exception 'Cuenta destino no encontrada'; end if;

  insert into transactions (user_id, account_id, to_account_id, kind, amount, description, date)
  values (auth.uid(), p_from_account, p_to_account, 'transferencia', p_amount, p_description, p_date)
  returning * into v_tx;

  return v_tx;
end $$;

-- ── pay_credit: baja saldo de cuenta, baja deuda, deja historial ────────────
create or replace function public.pay_credit(
  p_credit_id  uuid,
  p_account_id uuid,
  p_amount     numeric,
  p_date       timestamptz default now()
) returns public.transactions
language plpgsql security invoker set search_path = public as $$
declare
  v_tx public.transactions;
  v_credit_name text;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select name into v_credit_name from credits where id = p_credit_id and user_id = auth.uid();
  if not found then raise exception 'Crédito no encontrado'; end if;

  insert into transactions (user_id, account_id, kind, amount, description, date, credit_id)
  values (auth.uid(), p_account_id, 'pago_credito', p_amount, 'Pago a ' || v_credit_name, p_date, p_credit_id)
  returning * into v_tx;

  update accounts set balance = balance - p_amount
  where id = p_account_id and user_id = auth.uid();
  if not found then raise exception 'Cuenta no encontrada'; end if;

  -- la deuda no baja de cero: un pago mayor deja la deuda en 0
  update credits set total_debt = greatest(total_debt - p_amount, 0)
  where id = p_credit_id and user_id = auth.uid();

  insert into credit_payments (user_id, credit_id, account_id, transaction_id, amount, paid_at)
  values (auth.uid(), p_credit_id, p_account_id, v_tx.id, p_amount, p_date);

  return v_tx;
end $$;

-- ── contribute_goal: abono con o sin cuenta origen ──────────────────────────
create or replace function public.contribute_goal(
  p_goal_id    uuid,
  p_amount     numeric,
  p_account_id uuid default null,  -- null = solo registro (ahorro externo)
  p_date       timestamptz default now()
) returns public.goals
language plpgsql security invoker set search_path = public as $$
declare
  v_goal public.goals;
  v_tx_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'El monto debe ser mayor a cero'; end if;

  select * into v_goal from goals where id = p_goal_id and user_id = auth.uid();
  if not found then raise exception 'Meta no encontrada'; end if;

  if p_account_id is not null then
    insert into transactions (user_id, account_id, kind, amount, description, date, goal_id)
    values (auth.uid(), p_account_id, 'abono_meta', p_amount, 'Abono a ' || v_goal.name, p_date, p_goal_id)
    returning id into v_tx_id;

    update accounts set balance = balance - p_amount
    where id = p_account_id and user_id = auth.uid();
    if not found then raise exception 'Cuenta no encontrada'; end if;
  end if;

  update goals
  set current_amount = current_amount + p_amount,
      completed_at = case when current_amount + p_amount >= target_amount then coalesce(completed_at, now()) end
  where id = p_goal_id and user_id = auth.uid()
  returning * into v_goal;

  insert into goal_contributions (user_id, goal_id, account_id, transaction_id, amount, contributed_at)
  values (auth.uid(), p_goal_id, p_account_id, v_tx_id, p_amount, p_date);

  return v_goal;
end $$;

-- ── reverse_transaction: borrar revirtiendo todos los efectos ───────────────
-- Una transferencia revierte sus dos lados; un pago revierte la deuda;
-- un abono revierte la meta. Es también la base del "deshacer".
create or replace function public.reverse_transaction(p_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
declare v_tx public.transactions;
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
    update credits set total_debt = total_debt + v_tx.amount
    where id = v_tx.credit_id and user_id = auth.uid();
    delete from credit_payments where transaction_id = v_tx.id and user_id = auth.uid();
  elsif v_tx.kind = 'abono_meta' then
    update goals set current_amount = greatest(current_amount - v_tx.amount, 0), completed_at = null
    where id = v_tx.goal_id and user_id = auth.uid();
    delete from goal_contributions where transaction_id = v_tx.id and user_id = auth.uid();
  end if;

  delete from transactions where id = v_tx.id and user_id = auth.uid();
end $$;

-- ── update_transaction: editar reajustando saldos ───────────────────────────
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

  update transactions
  set account_id = p_account_id, kind = p_kind, amount = p_amount,
      description = p_description, category_id = p_category_id,
      date = coalesce(p_date, date), notes = p_notes
  where id = p_id and user_id = auth.uid()
  returning * into v_new;

  return v_new;
end $$;
