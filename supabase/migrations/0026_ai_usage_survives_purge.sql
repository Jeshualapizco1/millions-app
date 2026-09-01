-- ============================================================================
-- Millions v2 — el gasto de IA no desaparece al borrar una cuenta
--
-- `ai_usage.user_id` tenia `on delete cascade`: cuando el cron de purgado
-- borraba una cuenta, se llevaba TODAS sus llamadas de IA. El freno de mano
-- global (`ai_spend_this_month`) suma la tabla entera, asi que el gasto del
-- mes bajaba solo — dinero ya gastado que dejaba de contar contra el
-- presupuesto. Justo al reves de lo que un freno debe hacer.
--
-- Con `on delete set null` la fila se queda sin dueno pero conserva su costo.
-- Nadie puede leerla: la politica de RLS exige `user_id = auth.uid()` y null
-- no iguala a nadie. Es lo que se busca — es un dato contable, no del usuario.
--
-- `ai_calls_today` y `ai_calls_this_month` filtran por user_id, asi que las
-- filas huerfanas no cuentan contra ningun tope personal. Solo suman al gasto.
-- ============================================================================

alter table public.ai_usage alter column user_id drop not null;

alter table public.ai_usage drop constraint ai_usage_user_id_fkey;
alter table public.ai_usage
  add constraint ai_usage_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

comment on column public.ai_usage.user_id is
  'Null = la cuenta se borro. La fila se conserva porque su costo ya ocurrio y debe seguir contando contra el presupuesto del mes.';
