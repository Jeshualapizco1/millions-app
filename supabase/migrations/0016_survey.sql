-- ============================================================================
-- Millions v2 — que busca la persona (primera mitad del arranque guiado)
--
-- La 0015 resolvio la segunda mitad: configurar la app para que el tablero no
-- salga vacio. Esta resuelve la primera, que va ANTES y no pide un solo dato
-- duro: preguntar QUE BUSCA la persona.
--
-- El orden importa. Pedir saldos y sueldo en el primer minuto es pedir numeros
-- que nadie trae a la mano, y ahi es donde la gente cierra la app. Preguntar
-- que quiere lograr, en cambio, se contesta de memoria y con un toque. Cuando
-- termina, la pantalla de cierre le devuelve sus propias respuestas, y solo
-- entonces se le ofrece configurar sus cuentas.
--
-- Sirve a tres cosas a la vez:
--   1. La persona se siente escuchada en vez de recibir un "bienvenido"
--      generico con su nombre pegado.
--   2. El asesor de IA arranca sabiendo su meta y su dolor, asi que responde
--      en funcion de eso desde la primera consulta.
--   3. En agregado dice con que mensaje hablarle al mercado y que canal de
--      adquisicion funciona.
--
-- Sobre el punto 3 y la ley: el aviso de privacidad vigente ya declara como
-- finalidad secundaria "medir el uso agregado para mejorar la aplicacion", que
-- es exactamente este uso. Segmentar o dirigir publicidad a UNA persona por lo
-- que contesto seria otra finalidad y exigiria ampliar el aviso y subir
-- LEGAL_VERSION. Mientras el uso sea agregado, no hace falta.
--
-- Esta migracion NO marca profiles.onboarded_at. Esa marca significa "termino
-- el arranque entero" y la pone complete_onboarding() de la 0015, al final del
-- ultimo paso. Si se marcara aqui, quien contestara las preguntas y cerrara la
-- app nunca veria la parte de configurar sus cuentas.
-- ============================================================================

-- ── Respuestas ──────────────────────────────────────────────────────────────
-- Tabla propia en vez de columnas en profiles: el cuestionario va a cambiar y
-- asi la version vieja no se pierde ni obliga a migrar columnas cada vez.
-- Una fila por usuario (la PK es el user_id): re-contestar reemplaza.
--
-- Los valores que se guardan son llaves cortas ('salir_deudas'), no el texto
-- que se ve en pantalla: asi se puede reescribir la pregunta sin invalidar las
-- respuestas ya recogidas.
create table if not exists public.user_survey (
  user_id      uuid primary key references auth.users (id) on delete cascade,

  -- Pregunta 1 — que lo trajo. Una sola opcion. Da el angulo del mensaje.
  goal         text,
  -- Pregunta 2 — que le cuesta hoy. Varias opciones. Da el copy, en su dolor.
  pains        text[] not null default '{}',
  -- Pregunta 3 — como lleva sus cuentas hoy. Dice contra que competimos.
  current_tool text,
  -- Pregunta 4 — que cambiaria en su vida. Texto libre y opcional: es la que
  -- da su lenguaje literal, el mas util para escribir anuncios.
  dream        text,
  -- Pregunta 5 — como llego. Mide el canal de adquisicion. Va al final a
  -- proposito: es la unica administrativa y no debe abrir la conversacion.
  source       text,

  -- Version del cuestionario, para no mezclar respuestas de formatos distintos
  -- al sacar los numeros.
  survey_version text not null default '1',
  -- Falso si toco "Ahora no": la fila existe para no volver a preguntarle,
  -- pero sus respuestas estan vacias y no deben contar en las estadisticas.
  completed    boolean not null default true,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- El texto libre es lo unico sin tope natural. 2 KB es de sobra para una
-- respuesta honesta y corta lo que sea un intento de usar la fila como bodega.
alter table public.user_survey
  drop constraint if exists user_survey_dream_len;
alter table public.user_survey
  add constraint user_survey_dream_len check (dream is null or length(dream) <= 2000);

alter table public.user_survey enable row level security;
alter table public.user_survey force row level security;

-- Cada quien escribe y lee la suya. No hay delete: si la persona se va, la fila
-- cae por el ON DELETE CASCADE de auth.users, igual que las otras 12 tablas.
drop policy if exists user_survey_insert_own on public.user_survey;
drop policy if exists user_survey_read_own   on public.user_survey;
drop policy if exists user_survey_update_own on public.user_survey;

create policy user_survey_insert_own on public.user_survey
  for insert to authenticated with check (user_id = auth.uid());
create policy user_survey_read_own on public.user_survey
  for select to authenticated using (user_id = auth.uid());
create policy user_survey_update_own on public.user_survey
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Guardar las respuestas ──────────────────────────────────────────────────
-- Solo las respuestas. Terminar el arranque es complete_onboarding(), y son
-- momentos distintos: entre una y otra la persona todavia tiene que ver su
-- pantalla de cierre y decidir si configura sus cuentas.
create or replace function public.save_onboarding(
  p_goal         text default null,
  p_pains        text[] default '{}',
  p_current_tool text default null,
  p_dream        text default null,
  p_source       text default null,
  p_completed    boolean default true
)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.user_survey (user_id, goal, pains, current_tool, dream, source, completed, created_at, updated_at)
  values (
    auth.uid(),
    p_goal,
    coalesce(p_pains, '{}'),
    p_current_tool,
    nullif(btrim(p_dream), ''),
    p_source,
    p_completed,
    v_now,
    v_now
  )
  on conflict (user_id) do update set
    goal         = excluded.goal,
    pains        = excluded.pains,
    current_tool = excluded.current_tool,
    dream        = excluded.dream,
    source       = excluded.source,
    completed    = excluded.completed,
    updated_at   = v_now;

  return v_now;
end $$;

revoke all on function public.save_onboarding(text, text[], text, text, text, boolean) from public, anon;
grant execute on function public.save_onboarding(text, text[], text, text, text, boolean) to authenticated;
