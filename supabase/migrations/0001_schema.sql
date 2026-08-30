-- ============================================================================
-- Millions v2 — esquema base
-- Diseñado desde cero. No es una copia de las tablas jeshua_* del proyecto viejo.
-- Convenciones: snake_case, UUID v4 por defecto, timestamps con zona,
-- updated_at por trigger, montos NUMERIC(14,2) con CHECK.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Tipos ───────────────────────────────────────────────────────────────────
create type public.tx_kind as enum ('gasto', 'ingreso', 'transferencia', 'pago_credito', 'abono_meta');
create type public.credit_type as enum ('tarjeta', 'hipoteca', 'auto', 'personal', 'otro');
create type public.budget_period as enum ('semanal', 'mensual', 'anual');
create type public.category_kind as enum ('gasto', 'ingreso', 'ambos');
create type public.recurring_frequency as enum ('semanal', 'quincenal', 'mensual', 'anual');

-- ── updated_at automático ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text,
  base_currency  char(3) not null default 'MXN',
  timezone       text not null default 'America/Mazatlan',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── categories ──────────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 40),
  icon        text not null default '📦',
  color       text not null default '#6b7280' check (color ~ '^#[0-9a-fA-F]{6}$'),
  kind        public.category_kind not null default 'ambos',
  sort_order  int not null default 0,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);
create index categories_user_idx on public.categories (user_id, sort_order);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ── accounts ────────────────────────────────────────────────────────────────
create table public.accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 60),
  balance      numeric(14,2) not null default 0,
  currency     char(3) not null default 'MXN',
  icon         text not null default '🏦',
  color        text not null default '#7c6af7' check (color ~ '^#[0-9a-fA-F]{6}$'),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index accounts_user_idx on public.accounts (user_id, created_at);
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ── credits ─────────────────────────────────────────────────────────────────
create table public.credits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null check (length(trim(name)) between 1 and 60),
  type               public.credit_type not null,
  institution        text,
  total_debt         numeric(14,2) not null default 0 check (total_debt >= 0),
  credit_limit       numeric(14,2) check (credit_limit is null or credit_limit >= 0),
  monthly_payment    numeric(14,2) check (monthly_payment is null or monthly_payment >= 0),
  cut_day            smallint check (cut_day is null or cut_day between 1 and 31),
  payment_day        smallint check (payment_day is null or payment_day between 1 and 31),
  next_payment_date  date,
  interest_rate      numeric(5,2) check (interest_rate is null or interest_rate >= 0),
  notes              text,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index credits_user_idx on public.credits (user_id, created_at);
create trigger credits_updated_at before update on public.credits
  for each row execute function public.set_updated_at();

-- ── goals ───────────────────────────────────────────────────────────────────
create table public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (length(trim(name)) between 1 and 60),
  target_amount   numeric(14,2) not null check (target_amount > 0),
  current_amount  numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date     date,
  icon            text not null default '🎯',
  color           text not null default '#7c6af7' check (color ~ '^#[0-9a-fA-F]{6}$'),
  notes           text,
  account_id      uuid references public.accounts (id) on delete set null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, created_at);
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ── recurring_rules ─────────────────────────────────────────────────────────
create table public.recurring_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 80),
  kind         public.tx_kind not null check (kind in ('gasto', 'ingreso')),
  amount       numeric(14,2) not null check (amount > 0),
  account_id   uuid not null references public.accounts (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete set null,
  frequency    public.recurring_frequency not null default 'mensual',
  next_run     date not null,
  last_run     date,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index recurring_rules_due_idx on public.recurring_rules (next_run) where active;
create trigger recurring_rules_updated_at before update on public.recurring_rules
  for each row execute function public.set_updated_at();

-- ── transactions ────────────────────────────────────────────────────────────
-- account_name desaparece: se resuelve por join. Una transferencia es UNA fila:
-- account_id es el origen (resta) y to_account_id el destino (suma).
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  account_id     uuid not null references public.accounts (id) on delete restrict,
  kind           public.tx_kind not null,
  amount         numeric(14,2) not null check (amount > 0),
  description    text not null check (length(description) <= 200),
  category_id    uuid references public.categories (id) on delete set null,
  date           timestamptz not null default now(),
  notes          text,
  to_account_id  uuid references public.accounts (id) on delete restrict,
  credit_id      uuid references public.credits (id) on delete set null,
  goal_id        uuid references public.goals (id) on delete set null,
  recurring_id   uuid references public.recurring_rules (id) on delete set null,
  receipt_path   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- solo las transferencias llevan destino, y siempre distinto del origen
  check ((kind = 'transferencia') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id),
  check (kind <> 'pago_credito' or credit_id is not null),
  check (kind <> 'abono_meta' or goal_id is not null)
);
create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ── budgets ─────────────────────────────────────────────────────────────────
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  period       public.budget_period not null default 'mensual',
  amount       numeric(14,2) not null check (amount > 0),
  rollover     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, category_id, period)
);
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- ── credit_payments ─────────────────────────────────────────────────────────
create table public.credit_payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  credit_id       uuid not null references public.credits (id) on delete cascade,
  account_id      uuid references public.accounts (id) on delete set null,
  transaction_id  uuid references public.transactions (id) on delete set null,
  amount          numeric(14,2) not null check (amount > 0),
  paid_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index credit_payments_credit_idx on public.credit_payments (credit_id, paid_at desc);

-- ── goal_contributions ──────────────────────────────────────────────────────
create table public.goal_contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  goal_id         uuid not null references public.goals (id) on delete cascade,
  account_id      uuid references public.accounts (id) on delete set null,
  transaction_id  uuid references public.transactions (id) on delete set null,
  amount          numeric(14,2) not null check (amount <> 0),
  contributed_at  timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id, contributed_at desc);

-- ── ai_usage (rate limit + costo) ───────────────────────────────────────────
create table public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  intent      text not null check (intent in ('capture', 'advise')),
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  created_at  timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage (user_id, created_at desc);

-- ── Alta de usuario: perfil + categorías semilla ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, icon, color, kind, sort_order) values
    (new.id, 'Alimentación',   '🍔', '#f97316', 'gasto',   1),
    (new.id, 'Transporte',     '🚗', '#3b82f6', 'gasto',   2),
    (new.id, 'Salud',          '💊', '#ec4899', 'gasto',   3),
    (new.id, 'Educación',      '📚', '#0ea5e9', 'gasto',   4),
    (new.id, 'Entretenimiento','🎬', '#a855f7', 'gasto',   5),
    (new.id, 'Servicios',      '💡', '#eab308', 'gasto',   6),
    (new.id, 'Compras',        '🛍️', '#06b6d4', 'gasto',   7),
    (new.id, 'Nómina',         '💼', '#10b981', 'ingreso', 8),
    (new.id, 'Ventas',         '🌸', '#4ade80', 'ingreso', 9),
    (new.id, 'Transferencia',  '↔️', '#8b5cf6', 'ambos',  10),
    (new.id, 'Otros',          '📦', '#6b7280', 'ambos',  11);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
