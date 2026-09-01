-- ============================================================================
-- Millions v2 — que el repo y la base cuenten la misma historia
--
-- Tres desfases entre supabase/migrations/ y produccion, todos de aplicar
-- cosas "sueltas" por el editor SQL en vez de por apply_migration:
--
--   1. Dos firmas de apply_transaction. La 0010 agrego p_client_id con
--      `create or replace`, que en Postgres crea una funcion NUEVA cuando
--      cambian los parametros: la de 8 quedo viva al lado de la de 9. Toda
--      llamada sin p_client_id era ambigua ("Could not choose the best
--      candidate function") — asi se cayo supabase/tests/e2e.mjs en el paso
--      4. El cliente siempre manda p_client_id, por eso no se noto.
--
--   2. La 0014 (marco legal y borrado de cuenta) esta aplicada pero no
--      registrada en el ledger. Se registra aqui apuntando al archivo del
--      repo, con una version entre la 0013 y la 0015.
--
--   3. La 0006 existia en el ledger y no en el repo. Ya se volco al repo
--      (0006_recurring_service_grant.sql) con el SQL exacto del ledger; no
--      hay nada que aplicar de ella.
--
-- Nota: la 0016 esta registrada como dos entradas con otro nombre
-- ("onboarding_survey" y "survey_no_marca_onboarded"). Es cosmetico y se
-- deja como esta: renombrar entradas del ledger es reescribir historia.
-- ============================================================================

-- ── 1. Una sola apply_transaction ────────────────────────────────────────────
-- Las llamadas sin p_client_id (las pruebas) resuelven a la de 9 parametros
-- por su default null. Nada en SQL la llama: run_recurring_rules e
-- import_transactions insertan directo.
drop function if exists public.apply_transaction(uuid, public.tx_kind, numeric, text, uuid, timestamptz, text, uuid);

-- ── 2. Registrar la 0014 ─────────────────────────────────────────────────────
insert into supabase_migrations.schema_migrations (version, name, statements)
select
  '20260901120000',
  '0014_legal_and_account_deletion',
  array['-- Aplicada suelta el 1 de septiembre de 2026 y registrada por la 0019. SQL en supabase/migrations/0014_legal_and_account_deletion.sql']
where not exists (
  select 1 from supabase_migrations.schema_migrations where name = '0014_legal_and_account_deletion'
);
