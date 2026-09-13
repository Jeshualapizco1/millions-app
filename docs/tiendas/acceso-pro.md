# Acceso pro y fin de prueba

Corrección del 13 de septiembre de 2026. El bloqueo de la app miraba únicamente
la fecha de alta y los 14 días de prueba, aunque el servidor pudiera conceder
acceso en `subscriptions`.

La carga inicial y la recarga al volver a la app consultan ahora el permiso
`pro` de la sesión. La consulta filtra por usuario y permiso, y conserva la
política RLS existente de lectura de la fila propia. El cliente no puede
insertar ni modificar suscripciones.

- `active` con `expires_at = null`: acceso permanente.
- `active`, `trialing`, `in_grace_period` o `cancelled` con fecha futura: acceso
  mientras dure esa vigencia. Cancelar la renovación no quita días pendientes.
- `expired`, `paused`, `billing_issue`, estados desconocidos, fechas inválidas
  o una vigencia terminada: no conceden acceso pro.
- Los demás usuarios conservan los días de prueba que les correspondan.
- Si falla la consulta al iniciar, se muestra el error de carga; no se asume
  que el acceso está concedido ni que el usuario debe pagar.

Con acceso vigente se omiten tanto el muro de prueba terminada como el aviso
de próximos días de vencimiento. No se cambia `profiles.created_at`, no se
usa el correo como excepción en el frontend y no se escribe un permiso en
localStorage ni en metadata editable por el usuario.

El acceso permanente solicitado por el fundador se concedió como
`store = promotional`, `product_id = founder_access`, `will_renew = false`.
La asignación individual se realiza en la base; su identificador y su correo
no forman parte del repositorio público. No representa una compra ni un cobro.

La lectura del acceso y su asignación se verificaron contra la base real.
Las pruebas cubren una cuenta antigua que entra y abre el registro, otra sin
permiso que conserva el muro y la exportación, el aviso de prueba, la espera
de una consulta lenta y un error al verificar acceso. También cubren los
estados y fechas del permiso. Pasaron 186 pruebas de aplicación, 5 de
configuración y TypeScript/build; permanece el fallo esperado preexistente
de configuración comercial. No se inició sesión como el usuario para probar.

La web recibe la corrección con el despliegue de main. Un binario de Capacitor
anterior necesita recompilarse desde main para incluir esta lectura. Siguen
pendientes el webhook y el cobro en tiendas de la fase 3 de PENDIENTES.md.
