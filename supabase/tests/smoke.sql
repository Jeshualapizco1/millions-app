\set ON_ERROR_STOP on
-- usuario de prueba (dispara handle_new_user → perfil + 11 categorías)
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'test@test.mx', '{"name":"Test"}');
set test.uid = '11111111-1111-1111-1111-111111111111';

do $$ declare n int; begin
  select count(*) into n from public.categories where user_id = auth.uid();
  if n <> 11 then raise exception 'seed de categorias: % (esperaba 11)', n; end if;
end $$;

insert into public.accounts (id, user_id, name, balance) values
  ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Banco', 1000),
  ('aaaaaaaa-0000-0000-0000-000000000002', auth.uid(), 'Efectivo', 500);
insert into public.credits (id, user_id, name, type, total_debt)
values ('cccccccc-0000-0000-0000-000000000001', auth.uid(), 'Tarjeta', 'tarjeta', 300);
insert into public.goals (id, user_id, name, target_amount)
values ('dddddddd-0000-0000-0000-000000000001', auth.uid(), 'Viaje', 1000);

-- gasto 100 → Banco 900 | ingreso 50 → Banco 950
select public.apply_transaction('aaaaaaaa-0000-0000-0000-000000000001','gasto',100,'cafe');
select public.apply_transaction('aaaaaaaa-0000-0000-0000-000000000001','ingreso',50,'venta');
-- transferencia 200 Banco→Efectivo → 750 / 700
select public.transfer('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',200);
-- pago crédito 250 desde Efectivo → Efectivo 450, deuda 50
select public.pay_credit('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',250);
-- abono meta 100 desde Banco → Banco 650, meta 100
select public.contribute_goal('dddddddd-0000-0000-0000-000000000001',100,'aaaaaaaa-0000-0000-0000-000000000001');

do $$ declare b1 numeric; b2 numeric; d numeric; g numeric; begin
  select balance into b1 from public.accounts where id='aaaaaaaa-0000-0000-0000-000000000001';
  select balance into b2 from public.accounts where id='aaaaaaaa-0000-0000-0000-000000000002';
  select total_debt into d from public.credits where id='cccccccc-0000-0000-0000-000000000001';
  select current_amount into g from public.goals where id='dddddddd-0000-0000-0000-000000000001';
  if b1 <> 650 then raise exception 'Banco: % (esperaba 650)', b1; end if;
  if b2 <> 450 then raise exception 'Efectivo: % (esperaba 450)', b2; end if;
  if d <> 50 then raise exception 'deuda: % (esperaba 50)', d; end if;
  if g <> 100 then raise exception 'meta: % (esperaba 100)', g; end if;
end $$;

-- reversiones: al deshacer todo, los saldos regresan exactos
do $$ declare r record; begin
  for r in select id from public.transactions where user_id = auth.uid() order by created_at desc loop
    perform public.reverse_transaction(r.id);
  end loop;
end $$;
do $$ declare b1 numeric; b2 numeric; d numeric; g numeric; n int; begin
  select balance into b1 from public.accounts where id='aaaaaaaa-0000-0000-0000-000000000001';
  select balance into b2 from public.accounts where id='aaaaaaaa-0000-0000-0000-000000000002';
  select total_debt into d from public.credits where id='cccccccc-0000-0000-0000-000000000001';
  select current_amount into g from public.goals where id='dddddddd-0000-0000-0000-000000000001';
  select count(*) into n from public.transactions where user_id = auth.uid();
  if b1 <> 1000 or b2 <> 500 or d <> 300 or g <> 0 or n <> 0 then
    raise exception 'reversion: banco=% efectivo=% deuda=% meta=% txs=%', b1, b2, d, g, n;
  end if;
end $$;

-- RLS: otro usuario no ve nada; anon no tiene privilegios
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222','otro@test.mx');
set role authenticated;
set test.uid = '22222222-2222-2222-2222-222222222222';
do $$ declare n int; begin
  select count(*) into n from public.accounts;
  if n <> 0 then raise exception 'RLS filtra cuentas ajenas: %', n; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform count(*) from public.accounts;
    raise exception 'anon pudo leer accounts';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select '✅ smoke test OK' as resultado;
