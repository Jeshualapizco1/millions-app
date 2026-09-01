-- ============================================================================
-- Millions v2 — el backend puede disparar el generador de recurrentes
--
-- Esta migracion existia en la base (ledger 20260830212821) pero no en el
-- repo: se aplico suelta el 30 de agosto. Volcada al repo el 1 de septiembre
-- tal cual esta registrada en supabase_migrations.schema_migrations, para
-- que el repo y la base cuenten la misma historia.
-- ============================================================================

-- El backend (secret key) puede disparar el generador manualmente: sirve para
-- probarlo y para un "ejecutar ahora" si el cron llegara a fallar.
-- El cliente autenticado sigue sin poder llamarlo.
grant execute on function public.run_recurring_rules() to service_role;
