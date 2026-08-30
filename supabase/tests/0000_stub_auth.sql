-- Stub del entorno Supabase para validar migraciones en Postgres plano
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$ select current_setting('test.uid', true)::uuid $$;
