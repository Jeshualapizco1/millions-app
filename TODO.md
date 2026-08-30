# TODO — Estado de los hallazgos de la auditoría

Auditoría del 30 de agosto de 2026 sobre el código migrado. Este archivo
reemplaza a la lista original de la migración: todo lo que estaba anotado
ahí ya se resolvió o quedó registrado abajo con su motivo.

## ✅ Resuelto

### Seguridad
- **Base de datos abierta al público.** RLS estaba apagado y el rol `anon`
  tenía todos los privilegios: con el anon key del bundle cualquiera leía y
  escribía los datos de los 6 usuarios. Se migró a un proyecto propio con RLS
  forzado en las 11 tablas. Verificado: `GET /rest/v1/accounts` con la llave
  pública devuelve `permission denied`.
- **Proxy abierto a la API key de Anthropic.** La acción `chat` no verificaba
  el JWT y el cliente elegía modelo, `max_tokens` y `system`. Ahora exige
  autenticación, el modelo y el contexto se fijan en el servidor y hay límite
  de 20 llamadas por hora y usuario.
- **Mass-assignment en updates.** Se podía enviar `user_id` ajeno en el body y
  transferir una fila a otra persona. Eliminado: RLS aplica `WITH CHECK`.
- **Errores 500 devolvían `e.message` crudo.** Solo se nombra un fallo de
  configuración, que es accionable y no expone datos.

### Integridad de datos
- **Saldos no atómicos.** `updateBalance` hacía GET → suma en JS → PATCH, y
  `addTx` + `updateBalance` eran dos llamadas: si la segunda fallaba, el saldo
  quedaba desfasado. Ahora cada movimiento es una RPC atómica en Postgres.
- **Optimistic updates sin rollback.** Todos los handlers hacían
  `catch (e) { console.error(e) }`: la UI mostraba éxito y el dato desaparecía
  al recargar. Ahora hay toasts de error y se revierte el estado.
- **IDs temporales al servidor.** Borrar un presupuesto recién creado no
  borraba nada; borrar una transacción aún sin confirmar desfasaba el saldo.
  Se eliminaron los ids `tmp-`.
- **Renombrar una cuenta rompía el historial.** `account_name` estaba
  desnormalizado en cada transacción. Se quitó del esquema: se resuelve por
  join.
- **Zona horaria.** `new Date("2026-09-05")` se leía como medianoche UTC y en
  Culiacán salía un día antes. Todo pasa por `lib/dates.ts`.
- **Totales que mezclaban períodos.** El dashboard sumaba de toda la vida
  mientras la comparativa era del mes. Hay selector de período que manda sobre
  todas las cifras.
- **Transferencias inflaban gastos e ingresos a la vez.** Ahora son un `kind`
  propio y quedan fuera de ambos totales, igual que pagos y abonos.
- **Presupuesto de $0 dejaba la alerta encendida para siempre**
  (`spent/0 = Infinity`). Rechazado en cliente y por constraint.

### Bugs heredados del monolito
- `exportCSV` no escapaba comillas dobles → escapado RFC 4180.
- `daysUntil` nunca alcanzaba "¡Hoy!" y el día 31 se desbordaba en meses de 30.
- `CreditCard` ocultaba la tasa cuando era `0` (condición falsy).
- Abonar a una meta no descontaba de ninguna cuenta → ahora sí, opcionalmente.
- `sw.js` filtraba `/api/`, ruta que no existe, y nunca llamaba `cache.put`:
  cero offline pese a interceptar todo.
- Cambiar el tipo de un crédito conservaba los campos del tipo anterior.
- El tipo "otro" nunca mostraba mensualidad ni tasa.
- Faltaba `apple-touch-icon`: iOS usaba una captura de la página como ícono.

### Funcionalidad que faltaba
- Transferencias entre cuentas, pagar un crédito en un paso, abonar a meta
  desde una cuenta, editar transacciones, movimientos recurrentes, filtros y
  búsqueda en el historial, quitar cuentas (archivar si tienen historial).
- Confirmación antes de borrar lo que no tiene deshacer.
- Cambio de contraseña dentro de la app.

### Rendimiento y calidad
- Bundle de 669 KB en un solo archivo → partido en `react`/`supabase`/`charts`
  con las gráficas diferidas: la carga inicial pasó de ~200 KB a ~129 KB gzip.
- Historial de la IA acotado: el costo por llamada ya no crece con la sesión.
- Pruebas: `npm test` (12 unitarias de la lógica pura) y tres suites de
  integración contra el proyecto real en `supabase/tests/`.

## ⏳ Pendiente

- **IA con acciones**: que el asesor pueda ejecutar desde el chat, con
  confirmación en la UI. Requiere tool use y un viaje de ida y vuelta:
  la función devuelve la acción propuesta, el cliente la confirma y ejecuta,
  y le regresa el resultado al modelo.
- **Snapshots de patrimonio.** Hoy la tendencia se reconstruye desde los
  movimientos, así que un saldo o una deuda ajustados a mano la desvían.
  Un job mensual que guarde el corte real lo volvería historia registrada.
- **Presupuesto total mensual** y rollover del sobrante.
- **Categorías personalizadas**: la tabla ya existe por usuario, falta la UI.
- **Sincronización offline** de escrituras (hoy el service worker cachea el
  shell, pero no encola operaciones sin red).
- **CI en GitHub Actions** y **Sentry**.
- **Recordatorios por correo** antes de cada corte o pago.
- **Multi-moneda** (Revolut) y **recibos** en Storage.
- **Importar CSV** del banco.
- **Modo equipo** con espacios compartidos.

## ℹ️ No aplica

- **"Leaked password protection" de Supabase.** Requiere plan Pro y el
  proyecto está en Free. El advisor de seguridad seguirá marcándolo.
