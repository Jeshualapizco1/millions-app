-- ============================================================================
-- Millions v2 — Row Level Security
-- Regla única: cada fila pertenece a auth.uid(). El rol anon no ve nada.
-- ============================================================================

-- El anon key es público (va en el bundle). Que no pueda tocar nada de public.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- authenticated opera solo a través de RLS
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- ── profiles: la fila propia ────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy profiles_own on public.profiles
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── El resto: user_id = auth.uid() ──────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'accounts', 'credits', 'goals', 'recurring_rules',
    'transactions', 'budgets', 'credit_payments', 'goal_contributions', 'ai_usage'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$
      create policy %I_own on public.%I
        for all to authenticated
        using (user_id = auth.uid()) with check (user_id = auth.uid())
    $p$, t, t);
  end loop;
end $$;

-- ai_usage solo lo escribe la function con service_role; el usuario solo lee
drop policy ai_usage_own on public.ai_usage;
create policy ai_usage_read_own on public.ai_usage
  for select to authenticated using (user_id = auth.uid());
