-- ============================================================================
-- Millions v2 — donde vive el estado de la suscripcion (fase 3, G-D1)
--
-- Con cobro en tienda, quien sabe si alguien esta al corriente es Apple o
-- Google, y RevenueCat lo unifica. Esta tabla es la copia local de ese estado:
-- el servidor la lee para decidir si abre la app, sin preguntarle a nadie en
-- cada arranque y sin depender de que el telefono este en linea.
--
-- La regla que la hace segura: **el cliente nunca escribe aqui**. Si pudiera,
-- cualquiera con la llave publica —que va en el bundle y es publica a
-- proposito— se pondria `status = 'active'` y la app seria gratis. Solo lee
-- la suya. Escribe el webhook de RevenueCat con el service role, que vive en
-- la funcion de Netlify y no sale de ahi.
--
-- El webhook todavia no existe: se hace en la fase 3. La tabla va antes
-- porque el paywall, los referidos de G-D2 y el freno de fin de prueba leen
-- de aqui, y ninguno puede escribirse sin saber contra que.
-- ============================================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- El permiso que da la suscripcion. Hoy solo existe 'pro'; queda con nombre
  -- propio porque la comunidad de Skool, si algun dia entra, es otro distinto
  -- y no se puede colgar del mismo.
  entitlement text not null default 'pro',

  -- Vocabulario de RevenueCat, sin traducir: cuando algo no cuadre, lo que se
  -- compara es esto contra su panel, y traducirlo solo agrega un paso donde
  -- equivocarse.
  status text not null check (status in (
    'active',           -- al corriente
    'trialing',         -- dentro de la prueba gratuita de la tienda
    'in_grace_period',  -- le fallo el cobro; la tienda sigue reintentando
    'billing_issue',    -- fallo y ya no reintenta
    'cancelled',        -- no renovara, pero sigue vigente hasta expires_at
    'expired',          -- se acabo
    'paused'            -- solo Google: la persona la pauso
  )),

  -- De donde salio. 'promotional' es lo que concede el servidor sin cobrar:
  -- los meses gratis de los referidos (G-D2) entran por aqui.
  store text not null check (store in ('app_store', 'play_store', 'web', 'promotional')),

  -- El producto tal como se llama en la tienda ('millions_mensual_149').
  product_id text,

  -- Hasta cuando esta pagada. Null en las que no expiran solas.
  expires_at timestamptz,

  -- Si la tienda va a volver a cobrar. Separado de `status` a proposito: una
  -- suscripcion 'cancelled' sigue dando acceso hasta `expires_at`, y confundir
  -- las dos cosas es como se le quita el servicio a alguien que ya pago.
  will_renew boolean not null default false,

  -- El identificador de RevenueCat, para poder rastrear un caso concreto
  -- desde su panel hasta esta fila.
  rc_subscriber_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Una fila por permiso y por persona: el webhook hace upsert sobre esto.
  unique (user_id, entitlement)
);

comment on table public.subscriptions is
  'Estado de la suscripcion segun RevenueCat. La escribe solo el service role desde el webhook; el cliente unicamente lee la suya.';
comment on column public.subscriptions.will_renew is
  'Si la tienda volvera a cobrar. Una suscripcion cancelada sigue vigente hasta expires_at: el acceso lo decide status + expires_at, no esta columna.';

-- La consulta de siempre es "la de esta persona", y sin indice cada arranque
-- seria un recorrido de la tabla entera. Ademas la FK sin indice es lo que
-- marco el advisor en B13.
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

-- Solo lectura, y solo la propia. No hay politica de insert, update ni delete
-- para `authenticated`: sin politica, RLS niega. Es justo lo que se quiere —
-- quien decide quien pago es la tienda, no el telefono.
drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- `(select auth.uid())` y no `auth.uid()` a secas: envuelto se evalua una vez
-- por consulta en vez de una vez por fila. Es lo que se corrigio en B14 para
-- las otras trece tablas.

-- Los privilegios, al minimo. El grant all de Supabase da a authenticated
-- cosas que no necesita, y TRUNCATE ni siquiera pasa por RLS.
revoke all on public.subscriptions from authenticated, anon;
grant select on public.subscriptions to authenticated;

-- `updated_at` no puede quedar en manos de quien escribe: el webhook puede
-- llegar dos veces o desordenado, y lo que importa es cuando lo registramos.
create or replace function public.touch_subscriptions_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_subscriptions_updated_at();
