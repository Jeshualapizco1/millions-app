-- ============================================================================
-- Millions v2 — lo que marcaban los advisors de Supabase, en una migracion
--
-- 1. Quince llaves foraneas sin indice (lista sacada de pg_constraint el 1 de
--    septiembre). Sin indice, borrar una categoria o una cuenta recorre
--    transactions entera para verificar la FK, y las consultas por
--    categoria/credito/meta hacen scan. Indices parciales donde la columna
--    suele ser null (goal_id, credit_id, recurring_id): pesan menos y sirven
--    igual para el join y para la FK.
--
-- 2. Diecisiete politicas con `auth.uid()` a secas. Postgres lo evalua por
--    FILA; envuelto en `(select auth.uid())` se evalua una vez por consulta
--    (initplan). Mismo resultado, una fraccion del costo en tablas grandes.
--    Se cambia con `alter policy`, que conserva nombre, roles y comando.
--
-- 3. `authenticated` tenia TRUNCATE, TRIGGER y REFERENCES en las 15 tablas
--    por el grant all de Supabase. TRUNCATE no pasa por RLS. PostgREST no lo
--    expone, pero es privilegio sin uso: se quita, y tambien de los defaults
--    para las tablas que vengan. profiles ya habia quedado limpia en la 0017.
-- ============================================================================

-- ── 1. Indices para las FKs ──────────────────────────────────────────────────
create index if not exists budgets_category_id_idx            on public.budgets (category_id);
create index if not exists credit_payments_account_id_idx     on public.credit_payments (account_id);
create index if not exists credit_payments_transaction_id_idx on public.credit_payments (transaction_id);
create index if not exists credit_payments_user_id_idx        on public.credit_payments (user_id);
create index if not exists goal_contributions_account_id_idx  on public.goal_contributions (account_id);
create index if not exists goal_contributions_transaction_id_idx on public.goal_contributions (transaction_id);
create index if not exists goal_contributions_user_id_idx     on public.goal_contributions (user_id);
create index if not exists goals_account_id_idx               on public.goals (account_id);
create index if not exists recurring_rules_account_id_idx     on public.recurring_rules (account_id);
create index if not exists recurring_rules_category_id_idx    on public.recurring_rules (category_id);
create index if not exists recurring_rules_user_id_idx        on public.recurring_rules (user_id);
create index if not exists transactions_category_id_idx       on public.transactions (category_id);
create index if not exists transactions_credit_id_idx         on public.transactions (credit_id)    where credit_id is not null;
create index if not exists transactions_goal_id_idx           on public.transactions (goal_id)      where goal_id is not null;
create index if not exists transactions_recurring_id_idx      on public.transactions (recurring_id) where recurring_id is not null;

-- ── 2. Politicas con (select auth.uid()) ─────────────────────────────────────
alter policy accounts_own            on public.accounts            using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy budgets_own             on public.budgets             using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy categories_own          on public.categories          using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy credit_payments_own     on public.credit_payments     using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy credits_own             on public.credits             using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy goal_contributions_own  on public.goal_contributions  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy goals_own               on public.goals               using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy net_worth_snapshots_own on public.net_worth_snapshots using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy recurring_rules_own     on public.recurring_rules     using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy transactions_own        on public.transactions        using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy profiles_own            on public.profiles            using (id = (select auth.uid()))      with check (id = (select auth.uid()));
alter policy ai_usage_read_own       on public.ai_usage            using (user_id = (select auth.uid()));
alter policy client_errors_read_own  on public.client_errors       using (user_id = (select auth.uid()));
alter policy client_errors_insert_own on public.client_errors      with check (user_id = (select auth.uid()));
alter policy user_survey_read_own    on public.user_survey         using (user_id = (select auth.uid()));
alter policy user_survey_insert_own  on public.user_survey         with check (user_id = (select auth.uid()));
alter policy user_survey_update_own  on public.user_survey         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── 3. Privilegios sin uso ───────────────────────────────────────────────────
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;
-- Los defaults de Supabase se declaran para el rol que crea las tablas; se
-- cubren los dos que aparecen en este proyecto.
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from authenticated;
