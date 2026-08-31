# Millions — estado y plan

Tres partes: el **plan de lanzamiento público**, el **análisis de mercado** que
lo justifica, y el **historial de la auditoría** de agosto de 2026.

> Para arrancar el proyecto en otra máquina: **[README.md](README.md)**.
> Última actualización: 31 de agosto de 2026.
> **Siguiente tarea: paso 3 (aviso de privacidad y términos).**

---

# 1. Plan de lanzamiento público

**Objetivo:** abrir Millions a otras personas con una promoción de captación de
**60 días gratis**.

**Lo que ya está resuelto y no hay que construir:** la arquitectura
multi-usuario. RLS está forzado en todas las tablas y verificado con pruebas que
confirman que un usuario no puede ver ni tocar los datos de otro
(`supabase/tests/e2e.mjs`). Suele ser el trabajo caro y ya está hecho.

**La diferencia estructural frente a la competencia:** MonAi guarda los datos en
el iCloud del propio usuario y su costo por usuario es cero. Millions corre la IA
en el servidor con nuestra API key, así que **cada usuario cuesta dinero**. Todo
el paso 1 existe por eso.

## Paso 1 — Bajar el costo por usuario ✅ HECHO

- [x] **Un modelo por tarea.** Capturar es extracción (sacar monto, cuenta y
      categoría de una frase): pasó de Opus 5 a **Haiku 4.5**. Aconsejar sí
      razona sobre todo el panorama: pasó a **Sonnet 5**. Medido en producción:

      | Operación | Antes (Opus 5) | Ahora | Ahorro |
      |---|---|---|---|
      | Captura | $0.0044 | $0.00077 | 5.7× |
      | Asesor  | $0.0190 | $0.00438 | 4.3× |

      Un usuario típico (3 capturas + 1 consulta al día) pasa de **~$0.97 a
      ~$0.20 USD al mes**.

- [x] **Tres frenos de gasto**, todos por variable de entorno:
      - `AI_CALLS_PER_USER_DAY` = 15 — el día se corta a medianoche de
        Mazatlán, no UTC. Reemplazó al tope por hora, que dejaba un hueco:
        20/hora durante un día eran 480 llamadas, más que el mes entero.
      - `AI_CALLS_PER_USER_MONTH` = 400 — que nadie solo agote el presupuesto
      - `AI_MONTHLY_BUDGET_USD` = 40 — freno de mano global
- [x] **Falla cerrado.** Si no se puede verificar el presupuesto, la IA no
      responde. Un control de gasto que ante un error deja pasar no es control.
- [x] **Salida digna al frenar:** el mensaje dice que se puede seguir capturando
      a mano. El resto de la app sigue funcionando.
- [x] `ai_usage` registra modelo y costo por llamada (migración 0012).
- [x] Verificado en producción: el presupuesto global devuelve 503 al rebasarse,
      y la llamada 16 del día devuelve 429 con el mensaje de cuándo se renueva.

### Proyección de costo a 60 días

| Escenario | Costo aproximado |
|---|---|
| 100 usuarios, uso normal | ~$40 USD (~$700 MXN) |
| 100 usuarios, uso intenso | ~$240 USD (~$4,100 MXN) |
| 500 usuarios, uso normal | ~$200 USD (~$3,400 MXN) |
| 1,000 usuarios, uso normal | ~$400 USD (~$6,800 MXN) |

Con el tope global en $40 USD el gasto **no puede** rebasar esa cifra al mes,
pase lo que pase. Ajustar la variable según la meta de captación.

## Paso 2 — Registro seguro 🔶 CÓDIGO LISTO, FALTAN 3 PASOS EN EL PANEL

Hecho en código:
- [x] **Captcha de Cloudflare Turnstile** en el registro. Degrada solo: sin la
      variable `VITE_TURNSTILE_SITE_KEY` no se pinta, así que el código ya vive
      en producción y se activa cuando exista la llave.
- [x] **Mínimo de 8 caracteres** en la contraseña al registrarse.
- [x] **Mensajes de error entendibles**: correo sin confirmar, correo ya
      registrado, registro cerrado. Antes se mostraba el texto crudo de Supabase.
- [x] El aviso tras registrarse dice a qué correo se envió y que revise spam.

Pendiente, en paneles externos:
- [ ] **Crear el sitio en Cloudflare Turnstile** (gratis) y poner:
      - `VITE_TURNSTILE_SITE_KEY` en Netlify (llave pública)
      - La llave **secreta** en Supabase: Authentication → Attack Protection →
        Enable Captcha protection → Turnstile
- [ ] **Reactivar el registro**: Authentication → Sign In / Providers →
      *Allow new users to sign up*. **Hacerlo hasta el final**, cuando el paso 3
      (legal) y el 4 (arranque guiado) estén listos.
- [ ] Probar el alta con un correo real y confirmar que el mensaje llega y no
      cae en spam.
- [ ] Considerar códigos de invitación para controlar el ritmo de entrada.

## Paso 3 — Marco legal ⏳ SIGUIENTE

Es lo único que legalmente falta antes de poder abrir el registro. No depende
de nada externo, se puede hacer completo en una sesión.

- [ ] **Aviso de privacidad** (lo exige la LFPDPPP al tratar datos de terceros).
      Debe decir: qué datos se recogen, para qué, que se guardan en Supabase
      (EEUU), que Anthropic procesa el texto de las consultas de IA, cuánto se
      conservan, y cómo ejercer derechos ARCO con un correo de contacto.
- [ ] **Términos y condiciones**: qué es el servicio, que no es asesoría
      financiera profesional, qué pasa al terminar los 60 días, y que no se
      custodia dinero.
- [ ] **Casilla de aceptación en el registro**, guardando la fecha en `profiles`.
- [ ] **Páginas dentro de la app** (o enlaces) accesibles desde el registro y
      desde ajustes.
- [ ] **Borrar cuenta a petición del usuario.** Exportar a CSV ya existe;
      falta el borrado completo, que la ley también respalda.

> **Buena noticia:** Millions no mueve dinero ni custodia fondos, así que **no
> es una ITF** bajo la Ley Fintech y no requiere registro ante CNBV.

> **Buena noticia:** Millions no mueve dinero ni custodia fondos, así que **no
> es una ITF** bajo la Ley Fintech y no requiere registro ante CNBV.

## Paso 4 — Que el usuario nuevo se quede ⏳ SIGUE

- [ ] **Arranque guiado.** La brecha más grande y la más barata de cerrar. Hoy un
      desconocido entra a un tablero vacío. Cinco preguntas al entrar (cuentas,
      renta, techo mensual) y la app cobra sentido de inmediato.
      *Evidencia:* en la cuenta principal hay 0 movimientos fijos, 0
      presupuestos y 0 metas — media app sin usar por falta de configuración,
      no de funciones.
- [ ] **Mostrar los límites del plan gratuito** dentro de la app: cuántas
      consultas de IA quedan y cuándo termina la promoción.
- [ ] **Contador de días restantes** de los 60.
- [ ] Decidir qué pasa el día 61: ¿se bloquea la IA y sigue el registro manual,
      o se bloquea todo? *Recomendación: dejar la app usable sin IA.*

## Paso 5 — Después del lanzamiento

- [ ] Panel de uso: usuarios activos, costo por usuario, retención.
- [ ] Escaneo de recibos con foto — la única capacidad de captura que el mercado
      tiene y nosotros no.
- [ ] Notificaciones push reales: la ventaja de los créditos mexicanos solo sirve
      si avisa **antes** del corte, y hoy hay que abrir la app.
- [ ] Definir precio si la promoción funciona. Referencia: $149 MXN/mes o
      $1,420 MXN/año (MonAi).

---

# 2. Análisis de mercado

Investigación del 30 de agosto de 2026 sobre 16 apps.
Informe completo: https://claude.ai/code/artifact/c21562c0-df41-47a7-9af8-4b7924f3effc

## MonAi — el competidor más parecido y el mejor caso de estudio

| | |
|---|---|
| **Quién** | Florian Vates, desarrollador indie, Alemania/Austria |
| **Historia** | Renunció a su empleo en enero de 2026 para dedicarse a esto |
| **Tracción** | 250,000+ descargas · 4.8/5 · **~$50,000 USD/mes** (90% de MonAi) |
| **Plataformas** | iOS y Android nativas |
| **Datos** | En el iCloud del usuario. Sin login, sin servidor, **sin costo por usuario** |

**Precios en México:** $149 MXN/mes · $1,420 MXN/año · básico intro $69/mes o
$499/año · familiar $89/mes · estudiante $499–649/año.
**Capa gratuita: ~20 transacciones al mes.**

**Qué hace:** voz con lenguaje natural, registro automático desde Apple Pay, chat
de IA, listas compartidas, multi-moneda, presupuestos, recurrentes y atajos de
Siri.

**La lección real:** llegó a $50k/mes **asociándose con un creador de contenido**,
no agregando funciones. Su producto es más simple que Millions. La distribución
fue el lever, no el desarrollo.

## El resto del mercado

**Estados Unidos** — YNAB (Utah, $109 USD/año), Monarch Money (California,
$99.99/año), Copilot Money (Nueva York, $95/año, solo iOS), Quicken Simplifi
($48–72/año), Rocket Money, PocketGuard, Empower (gratis). **Mint cerró en 2024**
tras 15 años, y ese hueco explica el auge de Monarch.

**Europa y Asia** — Wallet/BudgetBakers (Praga, ~€4.49/mes, fuerte en modo
manual), Spendee (Chequia), Money Lover (Hanói), Cleo (Londres: la mejor IA
conversacional, pero **solo analiza, no registra**).

**Ola de voz 2026** — Finny, Peggy, MonAi, Voxoro. Categoría nueva este año.

**América Latina** — Mobills y Organizze (Brasil), apps de banco. **Fintonic se
retiró de México en 2025** por falta de rentabilidad. **Finerio** (mexicana,
pionera del open banking) dejó de vender al consumidor y hoy vende
infraestructura a bancos.

## Los cuatro hallazgos

1. **La sincronización bancaria no funciona bien en México.** La Ley Fintech de
   2018 obliga a abrir APIs, pero a ocho años solo se publicaron las reglas de
   datos abiertos (2020); las de datos transaccionales siguen pendientes. Por eso
   los gigantes de EEUU no cruzan, Fintonic se fue y Finerio pivotó. **Capturar
   por voz en lugar de sincronizar no es un plan B: es la estrategia correcta en
   este mercado.**
2. **La voz dejó de ser diferenciador único en 2026.** Lo escaso es la
   combinación: Cleo conversa pero no registra; Finny registra pero no ejecuta
   transferencias ni paga créditos.
3. **Nadie modela la tarjeta de crédito mexicana** — día de corte, día de pago,
   utilización. Ninguna app global lo construirá porque su mercado no lo
   necesita.
4. **El mercado cobra $800–$3,700 MXN al año.** Nuestra infraestructura cuesta
   cero; solo pagamos la IA, y ahora con techo.

## Dónde ganamos / dónde nos ganan

**Ganamos:** créditos a la mexicana · la IA ejecuta además de opinar · datos en
base propia (nadie puede apagarla como Intuit apagó Mint) · costo cero de
infraestructura.

**Nos ganan:** sincronización bancaria donde funciona · inversiones y patrimonio
automático · apps nativas con widgets y push · escaneo de recibos · onboarding ·
pulido visual (Copilot juega en otra liga).

**Lo que no perseguiría:** la sincronización bancaria. Es donde el mercado es más
fuerte, México está más trabado, y ya se estrellaron dos empresas financiadas.

---

# 3. Auditoría de agosto de 2026

## ✅ Resuelto

### Seguridad
- **Base de datos abierta al público.** RLS estaba apagado y el rol `anon` tenía
  todos los privilegios: con el anon key del bundle cualquiera leía y escribía
  los datos de los 6 usuarios. Se migró a un proyecto propio con RLS forzado.
  Verificado: `GET /rest/v1/accounts` con la llave pública devuelve
  `permission denied`.
- **Proxy abierto a la API key de Anthropic.** La acción `chat` no verificaba el
  JWT y el cliente elegía modelo, `max_tokens` y `system`. Ahora exige
  autenticación y todo se fija en el servidor.
- **Mass-assignment en updates.** Se podía enviar `user_id` ajeno y transferir
  una fila a otra persona. Eliminado: RLS aplica `WITH CHECK`.
- **Errores 500 devolvían `e.message` crudo.**

### Integridad de datos
- **Saldos no atómicos** → cada movimiento es una RPC atómica en Postgres.
- **Optimistic updates sin rollback** → toasts de error y reversión.
- **IDs temporales al servidor** → eliminados.
- **Renombrar una cuenta rompía el historial** → `account_name` salió del
  esquema; se resuelve por join.
- **Zona horaria**: `new Date("2026-09-05")` salía un día antes en Culiacán.
- **Totales que mezclaban períodos** → selector de período sobre todas las cifras.
- **Transferencias inflaban gastos e ingresos a la vez** → `kind` propio.
- **Presupuesto de $0** dejaba la alerta encendida para siempre.

### Bugs heredados del monolito
- `exportCSV` no escapaba comillas dobles.
- `daysUntil` nunca alcanzaba "¡Hoy!" y el día 31 se desbordaba.
- `CreditCard` ocultaba la tasa cuando era `0`.
- Abonar a una meta no descontaba de ninguna cuenta.
- `sw.js` nunca llamaba `cache.put`: cero offline pese a interceptar todo.
- Cambiar el tipo de un crédito conservaba campos del tipo anterior.
- El tipo "otro" nunca mostraba mensualidad ni tasa.
- Faltaba `apple-touch-icon`.
- **El header y el menú se iban con el scroll** en la PWA de iPhone: el
  contenedor usaba `minHeight` y crecía, así que scrolleaba la página entera.
  Ahora header pegado arriba y barra de pestañas fija abajo.
- **Los avisos de pago no se podían quitar**: la condición seguía siendo cierta.
  Ahora se descartan por ciclo y un pago vencido vuelve a insistir.

### Funcionalidad añadida
Transferencias · pagar crédito en un paso · abonar a meta desde una cuenta ·
editar transacciones · movimientos recurrentes con `pg_cron` · filtros y búsqueda
en historial · archivar cuentas · confirmación antes de borrar · cambio de
contraseña · patrimonio neto con tendencia · proyección de cierre de mes · IA que
propone acciones y la persona confirma · categorías personalizadas · techo de
gasto mensual con arrastre · importar CSV del banco · registro de errores propio ·
cola offline idempotente · multi-moneda.

### Rendimiento y calidad
- Bundle de 669 KB → partido en `react`/`supabase`/`charts` con gráficas
  diferidas: carga inicial de ~200 KB a ~129 KB gzip.
- `npm test`: 43 pruebas unitarias.
- Seis suites de integración contra el proyecto real en `supabase/tests/`.
- CI en GitHub Actions con un paso que falla si aparece una llave secreta en el
  bundle del cliente.

## 🧹 Limpieza de datos — 31 de agosto de 2026

A petición del usuario se vació la base para empezar de cero: movimientos,
cuentas, créditos, presupuestos, metas, recurrentes, cortes de patrimonio y
consumo de IA. **Se conservaron las 11 categorías y el perfil.**
Respaldo previo en `migration/respaldo-antes-de-limpieza-2026-08-31.json`.

## 🐛 Primer fallo capturado en producción

El registro de errores encontró un fallo real el mismo día que se instaló:
**"JWT issued at future"** desde la PWA de iPhone durante la carga inicial. El
reloj del teléfono va unos segundos adelantado respecto al servidor, el token
queda emitido "en el futuro" y la base lo rechaza; el usuario solo veía
*"No se pudieron cargar tus datos"*. **Arreglado:** ahora espera y reintenta una
vez antes de rendirse.

## ✅ Los cron corrieron por primera vez (31 de agosto, 6:00–6:15)

Los cuatro exitosos: recurrentes, corte de patrimonio y los dos de tipos de
cambio.

## ⏳ Pendiente (fuera del lanzamiento)

- **Multi-moneda quedó a medias.** Las cuentas convierten, las transacciones no:
  `Transaction` no guarda moneda, así que un gasto de $50 USD se muestra y se
  suma como $50 MXN. **No afecta mientras todo esté en pesos, pero hay que
  arreglarlo antes de usar Revolut en dólares.**
- **La cola offline solo cubre gastos e ingresos.** Transferencias, pagos y
  abonos fallan sin red en vez de encolarse.
- **No hay aviso de versión nueva** en la PWA ni refresco al volver a la app.
- **Recibos en Storage.**
- **Recordatorios por correo** (pospuesto; `pg_cron` listo, falta proveedor).

## 🚫 Descartado

- **Modo equipo / espacios compartidos.** Millions es de finanzas personales; el
  multi-tenant traería una tabla `workspaces` y reescribir todas las políticas
  RLS a cambio de nada que se use.
- **"Leaked password protection" de Supabase.** Requiere plan Pro y el proyecto
  está en Free. El advisor de seguridad seguirá marcándolo.
- **Sincronización bancaria.** Ver hallazgo 1 del análisis de mercado.
