-- ============================================================================
-- Millions v2 — reservar la llamada de IA antes de hacerla
--
-- chat.ts leia los tres contadores (dia, mes, presupuesto global), llamaba a
-- Anthropic y DESPUES insertaba en ai_usage. Dos huecos:
--
--   1. Carrera. N peticiones concurrentes leen el mismo contador, todas ven
--      "14 de 15" y todas pasan. El tope diario era una sugerencia.
--   2. Gasto sin registro. Si Netlify cortaba la funcion a los 10 s, o el
--      insert fallaba (su error se ignoraba), el dinero ya se habia gastado y
--      no contaba para nada: ni para el tope del usuario ni para el freno
--      global.
--
-- Esta RPC hace las dos cosas en una sola transaccion bajo un advisory lock:
-- cuenta, decide e inserta la fila con un costo ESTIMADO. La fila existe
-- antes de hablar con Anthropic; al terminar, chat.ts la corrige con los
-- tokens reales. Si la funcion muere a medias, queda la estimacion, que es
-- mejor que cero.
--
-- El lock es uno solo y global, no por usuario: el presupuesto mensual es de
-- todos, asi que dos usuarios distintos tambien compiten por el. Dura lo que
-- dura la transaccion (unos milisegundos), no vale la pena afinarlo.
--
-- Los topes llegan como parametros: siguen viviendo en las variables de
-- entorno del servidor, en un solo lugar.
-- ============================================================================

create or replace function public.reserve_ai_call(
  p_user            uuid,
  p_intent          text,
  p_model           text,
  p_estimated_cost  numeric,
  p_day_limit       integer,
  p_month_limit     integer,
  p_budget_usd      numeric
)
returns table (reserva bigint, hoy integer, mes integer, gastado numeric, motivo text)
language plpgsql security definer set search_path = public as $$
declare
  v_hoy     integer;
  v_mes     integer;
  v_gastado numeric;
  v_id      bigint;
  v_motivo  text;
begin
  if p_user is null then
    raise exception 'Falta el usuario';
  end if;

  -- Serializa todas las reservas. Se libera solo al terminar la transaccion.
  perform pg_advisory_xact_lock(hashtext('ai_usage_reserve'));

  -- Mismos cortes que siempre (el dia a medianoche de Mazatlan), reusando las
  -- funciones que ya existen para que no haya dos definiciones de "hoy".
  v_hoy     := public.ai_calls_today(p_user);
  v_mes     := public.ai_calls_this_month(p_user);
  v_gastado := public.ai_spend_this_month();

  if v_hoy >= p_day_limit then
    v_motivo := 'dia';
  elsif v_mes >= p_month_limit then
    v_motivo := 'mes';
  elsif v_gastado >= p_budget_usd then
    v_motivo := 'presupuesto';
  else
    insert into public.ai_usage (user_id, intent, model, cost_usd)
    values (p_user, p_intent, p_model, greatest(coalesce(p_estimated_cost, 0), 0))
    returning id into v_id;
  end if;

  return query select v_id, v_hoy, v_mes, v_gastado, v_motivo;
end $$;

revoke execute on function public.reserve_ai_call(uuid, text, text, numeric, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.reserve_ai_call(uuid, text, text, numeric, integer, integer, numeric) to service_role;
