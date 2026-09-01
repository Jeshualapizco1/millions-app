-- ============================================================================
-- Millions v2 — una cuenta archivada no recibe movimientos
--
-- Ninguna RPC verificaba archived_at: se podia registrar un gasto, recibir
-- una transferencia o pagar un credito desde una cuenta archivada. El
-- snapshot de patrimonio (0007) SI las excluye, asi que el saldo que se
-- movia ahi desaparecia del patrimonio y las cifras dejaban de cuadrar.
--
-- En vez de tocar seis RPC, un trigger en transactions: cualquier insercion
-- o cambio de cuenta que apunte a una archivada (origen o destino) se
-- rechaza con un mensaje que la app ya muestra tal cual. Cubre apply,
-- transfer, pay_credit, contribute_goal, update, import y recurrentes.
--
-- Y al archivar una cuenta se pausan sus movimientos fijos: si no, el cron
-- fallaria con esa regla cada manana (ya aislada por la 0020, pero seria
-- ruido diario en el log y una nomina que nunca llega sin que nadie avise).
-- ============================================================================

create or replace function public.reject_archived_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from accounts where id = new.account_id and archived_at is not null) then
    raise exception 'La cuenta está archivada. Desarchívala para registrar movimientos en ella.';
  end if;
  if new.to_account_id is not null
     and exists (select 1 from accounts where id = new.to_account_id and archived_at is not null) then
    raise exception 'La cuenta destino está archivada.';
  end if;
  return new;
end $$;

drop trigger if exists transactions_no_archived on public.transactions;
create trigger transactions_no_archived
  before insert or update of account_id, to_account_id on public.transactions
  for each row execute function public.reject_archived_account();

create or replace function public.pause_rules_of_archived_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update recurring_rules set active = false where account_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists accounts_archive_pauses_rules on public.accounts;
create trigger accounts_archive_pauses_rules
  after update of archived_at on public.accounts
  for each row execute function public.pause_rules_of_archived_account();
