# Millions — modelo de datos y decisiones

Referencia del **estado actual**. Para arrancar el proyecto, ver
[README.md](README.md). Para el plan y los pendientes, [TODO.md](TODO.md).

> Este archivo describía la app monolítica original (React por CDN, Babel en el
> navegador, tablas `jeshua_*`, RLS apagado). Nada de eso existe ya. Se
> reescribió el 31 de agosto de 2026 para reflejar la app real.

---

## Las decisiones que explican todo lo demás

**1. Postgres autoriza, no el código.** RLS forzado en todas las tablas con
`user_id = auth.uid()` tanto en `USING` como en `WITH CHECK`. El cliente habla
directo con Supabase. No existe una capa intermedia que pueda equivocarse al
filtrar — es el error que hizo que la base anterior estuviera abierta al
público.

**2. Cada movimiento de dinero es una transacción de Postgres.** Nunca "inserta
y luego actualiza el saldo" en dos llamadas: si la segunda falla, el saldo
queda mal para siempre. Todo pasa por RPCs atómicas.

**3. Lo que mueve dinero no es lo que lo consume.** Una transferencia entre
cuentas propias, un pago a crédito y un abono a meta **no** son gastos.
Contarlos inflaba los totales. Por eso `kind` es un enum y no un booleano.

**4. El servidor construye el contexto de la IA.** El cliente manda mensajes,
nada más. No elige modelo, ni `max_tokens`, ni el system prompt. Antes sí podía,
y eso convertía la función en un proxy abierto a la API key.

**5. La IA propone; la persona confirma.** Las herramientas del asesor reciben
**nombres**, no ids: el modelo nunca ve un UUID, así que no puede inventarse
uno. El cliente resuelve el nombre contra los datos reales y falla con mensaje
claro si hay ambigüedad — equivocarse de cuenta mueve dinero de verdad.

---

## Tablas

| Tabla | Para qué |
|---|---|
| `profiles` | Nombre, moneda base, zona horaria, techo de gasto mensual |
| `categories` | Por usuario, 11 sembradas al registrarse. Se ocultan, no se borran |
| `accounts` | Saldo, moneda, ícono, color. `archived_at` para quitar sin perder historial |
| `credits` | Tarjeta, hipoteca, auto, personal, otro. Día de corte y de pago |
| `goals` | Metas de ahorro, con cuenta asociada opcional |
| `recurring_rules` | Renta, suscripciones, nómina. El cron las ejecuta |
| `transactions` | El libro mayor. Ver notas abajo |
| `budgets` | Límite por categoría y período, con arrastre opcional |
| `credit_payments` | Historial de pagos a créditos |
| `goal_contributions` | Historial de abonos a metas |
| `net_worth_snapshots` | Corte mensual de patrimonio |
| `fx_rates` | Tipos de cambio. Dato compartido: solo el backend escribe |
| `ai_usage` | Modelo, tokens y costo por llamada. Alimenta los topes |
| `client_errors` | Fallos del cliente con ruta, acción y commit desplegado |

### Notas sobre `transactions`

- **No guarda el nombre de la cuenta.** Estaba desnormalizado y renombrar una
  cuenta rompía el historial. Se resuelve por join.
- **`kind`** es `gasto · ingreso · transferencia · pago_credito · abono_meta`.
  Solo los dos primeros cuentan como consumo o entrada.
- **Una transferencia es UNA fila**: `account_id` es el origen y
  `to_account_id` el destino. Revertirla es trivial.
- **El id lo puede decidir el cliente** (`p_client_id`). Así la cola offline
  reintenta sin duplicar cuando se pierde la respuesta.

---

## Funciones (RPC)

| Función | Qué hace |
|---|---|
| `apply_transaction` | Gasto o ingreso. Idempotente si se pasa `p_client_id` |
| `transfer` | Mueve entre cuentas propias |
| `pay_credit` | Baja saldo y deuda, y deja el pago en el historial |
| `contribute_goal` | Abona a una meta, opcionalmente desde una cuenta |
| `update_transaction` | Edita revirtiendo el efecto viejo y aplicando el nuevo |
| `reverse_transaction` | Borra revirtiendo todos los efectos |
| `import_transactions` | Hasta 2000 filas en una transacción; todo o nada |
| `upcoming_recurring` | Proyecta las próximas ocurrencias |
| `run_recurring_rules` | La ejecuta el cron. Se pone al corriente y no duplica |
| `take_net_worth_snapshots` | Corte mensual de patrimonio |
| `ai_calls_today` · `ai_calls_this_month` · `ai_spend_this_month` | Topes de gasto |

Las que dispara el cron son `SECURITY DEFINER` (corren sin sesión) pero
escriben cada fila con el `user_id` de su propia regla, y el cliente
autenticado **no** puede invocarlas.

---

## Frontend

Vite + React 18 + TypeScript. Estilos en línea, sin librería de UI ni de
estado. Los tipos se derivan de `src/lib/database.types.ts`, generado del
esquema real: una columna mal escrita no compila.

| Archivo | Responsabilidad |
|---|---|
| `lib/api.ts` | Única puerta a Supabase |
| `lib/periods.ts` | Qué entra en el período y qué cuenta como gasto |
| `lib/dates.ts` | Fechas locales. Prohibido `new Date(string)` fuera de aquí |
| `lib/analytics.ts` | Patrimonio neto y proyección de cierre |
| `lib/budgets.ts` | Presupuestos con arrastre |
| `lib/currency.ts` | Conversión. Las tasas son MXN → X: convertir **divide** |
| `lib/actions.ts` | Traduce lo que propone la IA a una operación real |
| `lib/offlineQueue.ts` | Cola en IndexedDB para capturar sin red |
| `lib/csvImport.ts` | Parser de estados de cuenta |
| `lib/alerts.ts` | Avisos descartables por ciclo |
| `lib/errorLog.ts` | Registro de errores en la propia base |

---

## Categorías

Sembradas al registrarse: Alimentación 🍔 · Transporte 🚗 · Salud 💊 ·
Educación 📚 · Entretenimiento 🎬 · Servicios 💡 · Compras 🛍️ · Nómina 💼 ·
Ventas 🌸 · Transferencia ↔️ · Otros 📦

El usuario puede crear las suyas, renombrarlas y ocultarlas. **No se borran:**
los movimientos que las usan perderían su etiqueta.
