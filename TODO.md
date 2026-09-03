# Millions — estado y plan

> **El porqué, no el qué.** Plan, mercado, historia y decisiones con su
> razón. No se trabaja de aquí: lo accionable vive en
> [PENDIENTES.md](PENDIENTES.md), y si algo de aquí se contradice con eso,
> gana `PENDIENTES.md`.

Tres partes: el **plan de lanzamiento público**, el **análisis de mercado** que
lo justifica, y el **historial de la auditoría** de agosto de 2026.

> Para arrancar el proyecto en otra máquina: **[README.md](README.md)**.
> Última actualización: 1 de septiembre de 2026.

## Para retomar desde otra máquina

> Última actualización: 2 de septiembre de 2026, tarde, ya en la Mac. Todo
> está en `origin/main` y la CI en verde; no hay nada sin pushear.

**La lista operativa vive en [PENDIENTES.md](PENDIENTES.md).** Este archivo
conserva el plan, el mercado y la historia. Las ideas que **no** están en el
plan actual viven en [IDEAS-FUTURAS.md](IDEAS-FUTURAS.md), y no se trabajan
hasta pasar por `PENDIENTES.md`.

**Estado en una línea:** las secciones A a F de la auditoría están cerradas
(críticos, medios, bajos, mejoras, visual y accesibilidad), la fase 0 de
tiendas tiene hecho lo que era código, y la fase 2 —el contenedor de
Capacitor— **ya compila en las dos plataformas** desde la Mac; lo que falta es
probarlo en teléfonos de verdad.

**Lo que se hizo al abrir la Mac (2 de septiembre):** `npm install` (sharp
pedía bajar libvips a mano por lo lento de la red), `npm test` y `npm run
build` en verde, y el proyecto de iOS **regenerado con CocoaPods**. Venía de
Windows con Swift Package Manager, que dejaba fuera el plugin de voz: en iOS
el micrófono no habría hecho nada. Ahora `xcodebuild` termina en
`BUILD SUCCEEDED` y el framework de voz está en el bundle. Se abre
`ios/App/App.xcworkspace`, no el `.xcodeproj`.

Después, el toolchain de Android: JDK 21 (con 17 Gradle no compila), las
command line tools del SDK y la platform 36. `./gradlew assembleDebug` da un
APK de 4.7 MB con el bundle id, el nombre de tienda, `RECORD_AUDIO` y la app
web dentro. El `gradlew` llegó de Windows sin permiso de ejecución.

Y se cerró D10: el dictado avisa cuando falla en vez de apagarse sin decir
nada, en nativo y en la web (`src/lib/voz.ts`).

**Lo siguiente, en este orden:**

1. En Supabase → Auth → Redirect URLs agregar
   `https://millionsjeshua.netlify.app/auth` y `https://app.millionsapp.io/auth`.
   **Urge aunque no compiles nada:** el registro web ya manda el correo de
   confirmación a `/auth` desde el commit `9c158d5`.
2. Probar en un teléfono real, empezando por la voz nativa: compila, pero
   nunca se ha ejecutado. Después: confirmación de correo por deep link,
   chips, offline, legal, borrado de cuenta y botón atrás.
3. Compilar con `VITE_API_BASE=https://millionsjeshua.netlify.app` mientras
   `app.millionsapp.io` no apunte al sitio. Sin eso la IA no responde en el
   teléfono: el WebView pediría a un dominio que todavía no existe.
4. El APK de debug se instala con
   `adb install android/app/build/outputs/apk/debug/app-debug.apk`
   (`adb` está en `$ANDROID_HOME/platform-tools`). Para iOS hace falta la
   cuenta de Apple y elegir el equipo en Xcode.

**Decisiones tomadas el 1 de septiembre por la noche:** nombre de tienda
"Millions - Finanzas con IA", dominio `millionsapp.io`, bundle id
`io.millionsapp.app`, correo `hola@millionsapp.io` (con eso `LEGAL_VERSION`
subió a `2026-09-01.3`: todos los usuarios ven el portón legal una vez).

**Sigue siendo tuyo y no es código:** apuntar el dominio y que el buzón
reciba, abrir las cuentas de Apple y Google (o decidir organización con
D-U-N-S, que se salta la prueba cerrada de 14 días), el precio y contacto de
cobro, Turnstile, activar el registro y la revisión legal. Ver fase 0 en
PENDIENTES.

**Los flujos del 1 de septiembre por la mañana siguen sin probarse a mano en
el navegador**: arranque guiado en dos mitades, chips de captura, muro de fin
de prueba, estado vacío y contador de consultas. Al entrar verás primero el
portón legal (versión `.3`) y luego el arranque si la cuenta no tiene cuentas.

### Lo que se hizo el 1 de septiembre

| Commit | Qué |
|---|---|
| `fa4c793` | Chips editables antes de guardar + un toque para hablar |
| `73c3983` | Fix de CI: la lógica pura arrastraba el cliente de Supabase |
| `5885ca7` | Arranque guiado + migración `0015` (aplicada) |
| `eb92a49` | Prueba de 30 días, muro de pago y corrección de los términos |
| tarde y noche | A1–A7, B1–B14, C1–C13, D, E y F de la auditoría; fase 0 y fase 2 de tiendas. Un commit por punto: `git log --oneline 1cacb8c..` |

---

# 1. Plan de lanzamiento público

**Objetivo:** abrir Millions a otras personas con una prueba gratuita de
**14 días para quien llega solo y 30 para quien llega invitado**; al vencer
entra un muro de pago. *(Los 60 días con la IA apagada cayeron el 1 de
septiembre y se quedaron en 30 parejos; el 3 se partió en 14/30 para que la
invitación tuviera premio sin empujar el primer cargo hasta el día 60. La
tabla vive en G-D2 de [PENDIENTES.md](PENDIENTES.md).)* Aplicado en el código
el 3 de septiembre: `PRUEBA_DIAS = 14` y `LEGAL_VERSION` en `2026-09-03.1`,
con los términos reescritos. Se hizo con el registro cerrado y un solo
usuario, porque en tres meses ya no sale gratis.

**La palanca de vuelta a 30 existe, y conviene saber cuándo usarla.** El
riesgo de 14 días es que casi nadie cobra quincenal y mensual dentro de la
misma quincena: mucha gente no vive un corte de tarjeta, ni una quincena
completa, ni el cierre de un mes —que es cuando el producto se explica solo,
con la gráfica mensual, el presupuesto y los próximos 7 días llenos— y el muro
llega antes de que se forme el hábito de registrar, que es lo que retiene. A
cambio, el primer cargo cae al día 14 en vez del 30 y la invitación pasa a
valer el doble. **Si la conversión sale mala, subir la prueba es lo primero
que hay que mover**, antes que tocar el precio: cuesta un número y una versión
legal. Volver a 30 no perjudica a nadie —a quien ya entró se le respetan sus
días—, así que la única cuenta que rehacer es la de costo de IA.

**Lo que ya está resuelto y no hay que construir:** la arquitectura
multi-usuario. RLS está forzado en todas las tablas y verificado con pruebas que
confirman que un usuario no puede ver ni tocar los datos de otro
(`supabase/tests/e2e.mjs`). Suele ser el trabajo caro y ya está hecho.

**La diferencia estructural frente a la competencia:** MonAi guarda los datos en
el iCloud del propio usuario y su costo por usuario es cero. Millions corre la IA
en el servidor con nuestra API key, así que **cada usuario cuesta dinero**. Todo
el paso 1 existe por eso.

## Paso 0 — Destrabar el registro 🔨 EN CURSO (1 de septiembre)

Salió de la revisión de la propuesta de rediseño. No es producto nuevo: es
quitar minas antes de que entren desconocidos.

- [x] **Ocultar el selector de moneda** — hecho el 1 de septiembre.
      Bandera `SELECTOR_DE_MONEDA_ACTIVO` en `src/lib/currency.ts`, con el
      porqué al lado y una prueba que se pone roja si alguien la enciende sin
      arreglar el fondo. La conversión de saldos, `fx` y `toBase` **siguen
      intactos**: una cuenta que ya tenga otra moneda se sigue mostrando y
      convirtiendo, y el modal la enseña sin dejar cambiarla. Las cuentas
      nuevas nacen en pesos. Era el único bloqueador duro para abrir el
      registro.
      *El porqué:* `Transaction` no guarda moneda y `sumSpend`/`sumIncome`
      (`src/lib/periods.ts:50-52`) no convierten, así que una sola cuenta en
      dólares corrompía en silencio gastos, ingresos, la dona, la gráfica de 6
      meses, **los presupuestos** y **la proyección de cierre**.
- [x] **El asesor ya convierte los saldos** (1 de septiembre). Sumaba
      `Number(a.balance)` a secas, así que con una cuenta en dólares afirmaba
      un patrimonio neto equivocado y lo afirmaba con seguridad. Ahora usa el
      mismo `toBase` que el cliente y le dice al modelo cuál era el monto
      original. **No cierra el multi-moneda de fondo:** las transacciones
      siguen sin guardar su moneda, y por eso el selector sigue apagado.

## Captura — borrador editable ✅ HECHO (1 de septiembre)

**El problema:** no existía ningún momento entre "hablaste" y "quedó escrito en
la base". `useVoice.onFinal` disparaba `sendTx` a los 200 ms y lo que el modelo
decidiera se guardaba. Así fue como un gasto de mentoría acabó en "Otros" y se
descubrió semanas después: no fue un error del modelo, fue que no había dónde
corregirlo.

- [x] **La captura produce un borrador, no una escritura.** `sendTx` deja de
      llamar `applyTx`; `useAI` expone `draft`, `updateDraft`, `confirmDraft` y
      `discardDraft`. Es el mismo patrón que ya usaba el asesor con
      `ProposedAction` / `confirmAction`, reusado tal cual. **`App.tsx` no ganó
      ni un `useState`.**
- [x] **Cuatro campos editables** en `src/components/TxDraftChips.tsx`: monto,
      gasto/ingreso, cuenta y categoría, más la descripción. Son exactamente
      los que el modelo puede equivocar y los que no se corrigen después sin ir
      a buscar el movimiento. Gasto/ingreso entró porque es el error más caro:
      los mismos $5,000 suman o restan según ese campo.
- [x] **Un toque para hablar.** El FAB abre el sheet **y** enciende el
      micrófono (`startMic` corre dentro del gesto del click, que es lo que el
      navegador exige para el permiso). De dos toques a uno.
- [x] **Si falla al guardar, el borrador se queda.** Antes un error de cuenta
      perdía la captura entera.
- [x] **Tocar el fondo no cierra si hay borrador.** Perder lo capturado sin que
      nadie lo decidiera es justo lo que veníamos a evitar.
- [x] **El modelo se entera de lo que se descartó**, para que un "no, fueron
      200" no se conteste sobre un movimiento que nunca existió.
- [x] **Bug encontrado de paso:** `applyTx` resolvía la cuenta con un `includes`
      simple, así que con "BBVA" y "BBVA Oro" podía cargar el gasto a la que no
      era, en silencio. Ahora usa el `findByName` de `lib/actions.ts` —exacta
      primero, parcial solo si no hay ambigüedad— que ya usaba el asesor.
      6 pruebas nuevas.

Pendiente de esto:

- [ ] **Probarlo en el navegador con voz real.** Compila, las 60 pruebas pasan y
      el build sale limpio, pero el flujo completo (dictar → chips → guardar)
      todavía no se ha ejercitado a mano.
- [ ] `nueva_cuenta` sigue guardando directo, sin borrador. Es menos dañino
      —una cuenta mal nombrada se ve de inmediato— pero queda anotado.
- [ ] "Mantener presionado para hablar" **no** se implementó. Exige
      `continuous: true` y parada manual, y en la PWA de iOS eso es frágil. Con
      el auto-corte de silencio actual son 2 toques (hablar + guardar) y si
      corta a media frase **ahora se ve en los chips** en vez de guardarse
      truncado. Revisar con el rediseño.

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
      - `AI_MONTHLY_BUDGET_USD` = 40 — freno de mano global.
        ⚠️ **Por confirmar en el panel de Netlify.** El default del código es
        **50** (`netlify/functions/chat.ts:32`); si la variable no está puesta
        allá, el tope real es 50, no 40.
- [x] **Falla cerrado.** Si no se puede verificar el presupuesto, la IA no
      responde. Un control de gasto que ante un error deja pasar no es control.
- [x] **Salida digna al frenar:** el mensaje dice que se puede seguir capturando
      a mano. El resto de la app sigue funcionando.
- [x] `ai_usage` registra modelo y costo por llamada (migración 0012).
- [x] Verificado en producción: el presupuesto global devuelve 503 al rebasarse,
      y la llamada 16 del día devuelve 429 con el mensaje de cuándo se renueva.

### Proyección de costo (la tabla es a 60 días; a 30 es la mitad, y a los 14 de la prueba estándar, la cuarta parte)

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

## Paso 3 — Marco legal ✅ HECHO (falta la revisión de un abogado)

Hecho en código (migración `0014_legal_and_account_deletion.sql`):

- [x] **Aviso de privacidad** y **términos y condiciones** completos, en
      `src/lib/legal.ts`. El aviso cubre lo que exige la LFPDPPP: qué datos se
      recogen, para qué, que viven en Supabase (EEUU), que Anthropic procesa el
      texto de las consultas, cuánto se conservan y cómo ejercer derechos ARCO.
      Los términos dicen que no es asesoría financiera, qué pasa al terminar
      la prueba y que no se custodia dinero.
- [x] **Casilla de aceptación en el registro**, sin premarcar. La versión viaja
      en el metadata del `signUp` y el trigger `handle_new_user` sella la fecha
      con `now()` del servidor — si la pusiera el cliente sería falsificable.
- [x] **Versionado del aviso.** `profiles.legal_version` guarda qué versión se
      aceptó. Al cambiar el texto se sube `LEGAL_VERSION` y la app vuelve a
      pedir la aceptación; sin esto las constancias dirían que alguien aceptó
      algo que nunca vio.
- [x] **Portón para cuentas que ya existían** (`LegalGate`): sin constancia no
      se entra. Deja cerrar sesión, porque un muro sin salida convierte
      "no acepto" en "no puedes ni salir".
- [x] **Documentos accesibles siempre**: desde el registro, desde la pantalla de
      inicio de sesión y desde Perfil.
- [x] **Borrar cuenta con 30 días de gracia.** `request_account_deletion` marca
      la fecha, la cuenta sigue usable, un aviso no descartable recuerda el
      plazo y se puede cancelar de un toque. El cron `millions-purge-accounts`
      (6:30 AM Mazatlán) borra de `auth.users` y las 12 tablas caen por
      `ON DELETE CASCADE`.
- [x] 10 pruebas nuevas: el plazo de gracia y la integridad de los textos.

Pendiente:

- [x] **`RESPONSABLE`, `DOMICILIO` y `CORREO_ARCO` llenos** (1 de septiembre):
      María de Jesús Acosta García, Culiacán, Sinaloa, `hola@millionsapp.io`
      (el correo pasó de `.com` a `.io` con la versión `2026-09-01.3`).
      `LEGAL_VERSION` subió a **2026-09-01.2** porque la `2026-09-01` ya se
      había aceptado con los datos en PENDIENTE: dejar la misma cadena
      apuntando a un texto distinto haría que la constancia dijera que alguien
      aceptó algo que nunca vio. La app vuelve a pedir la aceptación, que es
      justo para lo que existe el portón.
      El test que fallaba a propósito pasó a montar guardia: ahora verifica que
      los tres aparezcan de verdad en el aviso —incluido el `intro`, donde
      viven el nombre y el domicilio—.
- [ ] Que un abogado revise los textos antes de abrir el registro.

> **La migración 0014 ya está aplicada.** Verificado el 1 de septiembre contra
> el proyecto: `profiles` tiene `legal_version`, `legal_accepted_at` y
> `deletion_requested_at`, y el cron `millions-purge-accounts` está activo.

> **Buena noticia:** Millions no mueve dinero ni custodia fondos, así que **no
> es una ITF** bajo la Ley Fintech y no requiere registro ante CNBV.

## Perfil — hecho

Vista nueva (`src/views/Perfil.tsx`), alcanzable tocando el nombre en el header.
No se agregó una séptima pestaña: la barra inferior ya tenía seis a 9px y una
más las dejaba ilegibles en un teléfono. A cambio, el header quedó **más**
limpio que antes — los botones 🔑 y ↩ se mudaron adentro de Perfil.

Contiene: nombre, correo y antigüedad · cambiar contraseña · cerrar sesión ·
exportar todo a CSV (el derecho de acceso ARCO) · aviso y términos · constancia
de qué versión se aceptó y cuándo · borrar cuenta.

## Paso 4 — Que el usuario nuevo se quede 🔨 EN CURSO

### El arranque quedó en dos mitades, en este orden

**Decisión del 1 de septiembre por la tarde:** el arranque de configuración se
construyó primero, y al revisarlo salió su problema de fondo — pedir saldos y
sueldo en el primer minuto es pedir números que nadie trae a la mano, antes de
haberle dado nada a cambio. No se tiró: se le antepuso una mitad sin fricción.

1. **Qué busca la persona** (`src/views/Onboarding.tsx`, migración `0016`).
   Cinco preguntas de un toque, cero datos duros: qué te trajo · qué te cuesta
   hoy (varias) · cómo llevas tus cuentas · qué cambiaría en tu vida (texto
   libre, opcional) · cómo llegaste a Millions. La última va al final por ser la
   única administrativa: abrir con "¿cómo nos encontraste?" hace que la
   conversación arranque siendo sobre nosotros y no sobre la persona.

2. **Pantalla de cierre con confeti.** Le devuelve sus propias respuestas, su
   frase entrecomillada incluida. Cada párrafo sale de una respuesta concreta y
   **si no contestó algo, ese párrafo no aparece**: un relleno genérico
   delataría que en realidad nadie leyó nada. Contesta un solo dolor y no los
   seis, porque es una felicitación y no un folleto de funciones.
   `src/components/Confeti.tsx` dispara desde las dos esquinas de abajo con la
   Web Animations API — sin librería (canvas-confetti pesa ~7 KB gzip para tres
   segundos que ocurren una vez en la vida de la cuenta) y respetando
   `prefers-reduced-motion`.

3. **Configurar las cuentas**, desde un botón de esa pantalla. La configuración
   dejó de ser el peaje de entrada y pasó a ser una oferta, cuando la persona ya
   se sintió escuchada. Se puede decir "prefiero explorar primero".

`profiles.onboarded_at` marca el final del recorrido **entero**, no el de las
preguntas: `save_onboarding` solo guarda respuestas y `complete_onboarding()`
es quien marca. Si se marcara al contestar, quien cerrara la app en la pantalla
de cierre nunca vería la parte de configurar.

**El asesor recibe las respuestas** en su system prompt (`contextoParaAsesor`),
traducidas a lenguaje natural: al prompt nunca le llega `salir_deudas`. Responde
sabiendo la meta y el dolor desde la primera consulta.

**El asesor quedó acotado a finanzas.** Política, salud, nutrición, tareas o
programar quedan fuera; al declinar da una frase amable y ofrece algo concreto
con sus datos, en vez de un sermón. Cubre el disfraz ("¿qué opinas de la
elección, para mi cartera?") y los intentos de cambiarle el papel.

`user_survey` con RLS forzado y las tres políticas atadas a `auth.uid()`.
Verificado en producción: el dueño ve su fila, otro usuario ve cero, no puede
modificar la ajena, y `anon` ni siquiera tiene el `grant` para intentarlo.

**11 pruebas nuevas** (85 en total). No prueban la redacción sino la promesa:
que el cierre repita lo que de verdad contestó, que no invente cuando no
contestó, y que una llave desconocida se ignore en vez de pintar "undefined".

### La segunda mitad

- [x] **Arranque guiado** — hecho el 1 de septiembre. `src/views/Arranque.tsx`,
      tres pantallas: qué cuentas tienes y con cuánto · cuánto entra al mes y a
      qué cuenta · techo mensual de gasto. Al terminar, la persona ya tiene
      cuentas, una regla de ingreso mensual y `monthly_budget` — o sea saldo,
      patrimonio neto y proyección de cierre, que es media app que antes
      arrancaba apagada.
      - Migración `0015_onboarding.sql`: columna `profiles.onboarded_at` y la
        RPC `complete_onboarding()`. **Ya aplicada** al proyecto. Vive en la
        base y no en el navegador porque cambiar de teléfono no debería volver
        a preguntar lo mismo, y porque "cuántos terminaron el arranque" es la
        cifra que va a querer mirar el panel de uso del paso 5.
      - Las cuentas que ya existían quedaron marcadas como hechas en la propia
        migración: nadie con la app montada ve el arranque.
      - **Se puede saltar**, entero o los dos últimos pasos. Obligar a
        configurar antes de dejar ver nada es la forma más rápida de que
        alguien cierre y no vuelva.
      - Reintentar no duplica: al terminar se saltan las cuentas cuyo nombre ya
        existe, por si alguien abandonó a medias.
      - Los bancos comunes en México van como chips de un toque; teclear menos
        es la mitad de terminar el arranque.
      - `nextMonthlyDate` en `lib/dates.ts` (5 pruebas): arma el `next_run`
        con getFullYear/getMonth/getDate y **no** con `toISOString`, que de
        tarde en México devuelve el día siguiente — la regla habría arrancado
        un día tarde todos los meses. El día 31 cae en el último del mes.
      - **`App.tsx` no ganó ni un `useState`:** todo el estado del arranque es
        local a la vista.
- [x] **Decidido el día 31: muro de pago.** La prueba baja de 60 a 30 días y al
      vencer se bloquea el uso de la aplicación, no el acceso a los datos.
- [x] **Contador de días** (`PRUEBA_DIAS = 30` en `legal.ts`). Siempre visible
      en Perfil; arriba solo aparece la última semana, porque un contador
      encendido los 30 días es ruido y a 7 días todavía da tiempo de decidir.
- [x] **Muro de fin de prueba** (`src/views/FinDePrueba.tsx`). Va después del
      portón legal —los términos que lo explican hay que aceptarlos primero— y
      antes del arranque: no tiene sentido pedirle a alguien que configure una
      app que no va a poder usar.
      - **Con salidas, y no por cortesía:** exportar a CSV, leer el aviso y los
        términos, cerrar sesión y borrar la cuenta. El derecho de acceso y
        cancelación de la LFPDPPP no se suspende porque se acabe una promoción,
        y los términos nuevos lo prometen por escrito.
- [x] **Los términos se corrigieron y `LEGAL_VERSION` subió a `2026-09-01`.**
      El texto publicado prometía que al no continuar *"conservarás el acceso a
      tus datos... podríamos limitar únicamente las funciones del asistente"* —
      lo contrario de un muro. Cobrar contra unos términos que dicen otra cosa
      es el problema caro. 5 pruebas nuevas amarran que el texto y el código
      digan lo mismo.
- [ ] **Llenar `PRECIO_TEXTO` y `CONTACTO_PAGO`** en `src/lib/legal.ts`. Hoy el
      muro dice honestamente que falta configurarlos. Hay un `it.fails` que se
      pone verde al llenarlos, igual que con los datos del responsable.
      **No hay cobro automático:** el botón lleva a un correo o enlace. Integrar
      un cobro de verdad (Stripe / Mercado Pago) es trabajo aparte.
- [x] **Estado vacío con tres botones** — hecho el 1 de septiembre
      (`src/views/Vacio.tsx`). Sin cuentas, Inicio ya no es "Saldo Total $0"
      más cinco tarjetas vacías: es crear cuenta · hacer el arranque guiado ·
      registrar un crédito. La cuenta va primero porque sin ella no se puede
      capturar ni importar; el crédito entra porque es el diferenciador y no
      necesita cuenta.
      - **El arranque se puede reabrir** desde ahí. Es una pestaña sin botón
        (`tab === "arranque"`), igual que "perfil": **`App.tsx` no ganó ni un
        `useState`**. Al reabrirlo no vuelve a sellar `onboarded_at` y
        "saltar" solo regresa a Inicio.
      - Con cuenta pero sin movimientos, "Recientes" e Historial ofrecen
        **capturar el primero** con el mismo gesto del FAB (abre el sheet y
        enciende el micrófono). Cuentas tiene su tarjeta vacía con el patrón
        de Créditos.
- [x] **Consultas de IA restantes** — hecho el 1 de septiembre. Sin migración:
      la RPC sigue siendo solo del servidor. `chat.ts` responde a **`GET`** con
      `{ uso: { hoy, tope } }` y cada `POST` devuelve `uso` ya contando la
      llamada. El tope vive **solo** en `AI_CALLS_PER_USER_DAY`; el cliente
      nunca lo copia, así que no puede desfasarse. Se pide una vez al entrar
      (`useAI`) y se muestra en Análisis ("Te quedan N consultas de IA hoy")
      en Perfil y en el sheet de captura, que es donde se gasta. Si el GET
      falla no se muestra nada: es informativo, el que decide sigue siendo el
      servidor. `src/lib/aiUso.ts`, 4 pruebas.
- [ ] Probar en el navegador: arranque, chips, muro, estado vacío y contador
      de consultas. La cuenta actual tiene `onboarded_at` en null y 0
      cuentas, así que verá el arranque en la próxima carga; y
      `LEGAL_VERSION` cambió, así que antes verá el portón legal.

## Crecimiento — dos programas separados, decidido el 1 de septiembre ⏳ SIGUE

**Por qué dos y no uno.** Recompensar con dinero y recompensar con descuento
sirven a públicos distintos, y meterlos en un mismo programa es lo que los
vuelve inmanejable. La evidencia está en el propio análisis de mercado: MonAi
llegó a ~$50,000 USD/mes **asociándose con un creador de contenido**, no
agregando funciones. La distribución fue el lever.

> **Nada de esto arranca sin cobro automatizado.** Hoy `PRECIO_TEXTO` y
> `CONTACTO_PAGO` siguen en PENDIENTE y el muro de `FinDePrueba` solo ofrece un
> contacto: se cobra a mano. El orden es cobro → referidos → afiliados, porque
> el primero no puede existir sin cobro y el tercero además necesita ingresos
> con qué pagar las comisiones.

### A. Usuarios normales — meses gratis por invitar

**La tabla de descuentos 15/40/100 % se cayó el 3 de septiembre**, y no por
gusto: con cobro en tienda el precio lo fija Apple o Google, y lo único que se
puede mover son *offer codes* y *promotional offers*, que no sirven para un
descuento que sube y baja cada renovación según cuántos invitados sigan
pagando. Lo que sí se puede conceder desde el servidor son **meses gratis**,
vía *promotional entitlements* de RevenueCat.

**La decisión vigente vive en G-D2 de [PENDIENTES.md](PENDIENTES.md)**: el
invitado estrena con un mes gratis, quien invita gana un mes cuando al invitado
le entra su primer cargo real, y hay tope de 12 meses gratis al año.

Lo que sigue valiendo del análisis original, porque no dependía del mecanismo:

- Recompensar a usuarios normales **no genera obligación fiscal** — un mes
  gratis es menos ingreso, no un pago—, y por eso van aquí y no al programa B.
- **Nada de esto arranca sin cobro automatizado.** El orden sigue siendo cobro
  → referidos → afiliados.
- **Nunca cobrar retroactivo.** Si un invitado cancela, no se le quita nada a
  quien lo invitó: los meses ya concedidos son suyos. Cobrar hacia atrás es la
  causa número uno de disputas y contracargos.
- **Escalonado y no todo-o-nada.** Quien trae un amigo tiene que ganar algo el
  primer día; con la tabla nueva eso se cumple solo, porque cada invitado que
  paga vale un mes.
- **Mostrar el progreso en pantalla** ("llevas 2 invitados pagando; tienes 2
  meses gratis guardados"), que era lo que arreglaba la debilidad del plan
  anual.

### B. Creadores de contenido — 20% en dinero, con leaderboard

Son pocos, controlables, tienen RFC y saben facturar. Es donde está el
crecimiento real.

- [ ] **20% de comisión.** Falta decidir dos cosas que cambian mucho el costo:
      ¿del primer pago o recurrente? ¿de por vida o los primeros 12 meses?
      *Lo estándar en software es 20–30% recurrente durante 12 meses:*
      suficiente para que valga la pena promoverlo, acotado para que no coma el
      margen para siempre. A $149/mes, un 20% de por vida son $29.80 mensuales
      saliendo de la cuenta indefinidamente por cada usuario referido.
- [ ] **Leaderboard público con premios semanales.** Solo para este programa: a
      un usuario normal, verse en el lugar 300 lo desmotiva más de lo que lo
      empuja; entre creadores compitiendo, la tabla motiva.
- [ ] **Rotar la categoría del premio** (más afiliados de la semana · mejor
      conversión · primer afiliado de alguien nuevo). Premiar solo al primer
      lugar hace que a la tercera semana los demás sepan que no le van a ganar
      al de siempre y dejen de intentar. Y es un compromiso operativo **cada
      semana**, no un lanzamiento.
- [ ] **Nombre público, con constancia.** Los creadores quieren reconocimiento,
      así que no hay que esconderlo — pero sí dejar registro de que lo
      aceptaron, con el mismo patrón que el aviso legal
      (`legal_accepted_at` + `legal_version`). Decirlo en pantalla no basta: si
      alguien reclama, lo que vale es el registro de qué aceptó y cuándo.
      Con eso **no hace falta tocar el aviso de privacidad**.
- [ ] **Lo fiscal, antes del primer pago.** Pagar comisiones a personas físicas
      en México obliga a pedir CFDI y retener ISR e IVA; sin el RFC del afiliado
      el gasto no es deducible. Con tres creadores es manejable — y es
      exactamente la razón por la que los usuarios normales van al programa A.
- [ ] Definir medio de pago (SPEI o PayPal), umbral mínimo de retiro y qué se
      hace con los datos bancarios de cada afiliado.

### Arquitectura común

Tabla `referrals` (quién invitó a quién + estado de pago del invitado), un
código de invitación por persona y una función que cuente activos. El cálculo
del precio es una consulta.

**Lo que hoy no existe es el cobro automatizado, y eso no bloquea el diseño:**
el estado "está pagando" se marca a mano por ahora, y el día que se conecte
Stripe o Mercado Pago lo único que cambia es **quién escribe ese campo**, no la
lógica del beneficio.

## Paso 5 — Después del lanzamiento

- [ ] Panel de uso: usuarios activos, costo por usuario, retención.
- [ ] Notificaciones push reales: la ventaja de los créditos mexicanos solo sirve
      si avisa **antes** del corte, y hoy hay que abrir la app.
      **Alternativa sin app nativa: un `.ics` con los días de corte y pago.**
      Empezar por la versión que se genera y descarga en el cliente, con
      `RRULE` mensual: cero servidor, cero token, cero superficie de privacidad.
      La suscripción por URL exige una tabla de tokens, y ese token queda en
      texto plano en los servidores de Apple/Google y en los logs de Netlify;
      solo vale la pena si alguien pide que se actualice solo. Cuidado con
      `BYMONTHDAY=31`: se salta los meses de 30 días, hay que mapear 29/30/31
      a `BYMONTHDAY=-1`.
      **No sustituye el push del todo:** cubre fechas fijas (corte, pago,
      renta), no lo reactivo ("llevas 80% de Alimentación el día 12"), que es
      lo que haría abrir la app.
- [ ] Definir precio si la promoción funciona. Referencia: $149 MXN/mes o
      $1,420 MXN/año (MonAi).

## Paso 6 — Identidad de marca y rediseño ⏸️ PAUSADO (se contrata)

Decisión del 1 de septiembre: la identidad visual la hace un diseñador
externo. Aquí queda medido lo que se le entrega, para no pagar por que alguien
tome decisiones de producto que ya están tomadas.

**Lo que de verdad está mal, medido y no estimado:**

- **593 bloques `style={{}}`** en `src`. Concentrados: Dashboard 92, Metas 59,
  CreditCard 31 — el 31% de los bloques y casi todo lo que se ve.
- **Falta escala tipográfica.** 17 tamaños distintos entre 9 y 40 px, elegidos
  según hizo falta. Es lo que más la hace ver casera.

**Lo que NO está mal, contra lo que parecía:**

- **La paleta ya está centralizada** en `src/lib/constants.ts` (`C` con 12
  colores semánticos, `S` con card/inp/btn/btnO/lbl), y los componentes ya la
  consumen. Solo hay 21 literales hex fuera de ahí, y casi todos son variantes
  alfa de la misma paleta (`#7c6af733` = `C.accent + "33"`). Las decisiones de
  color reales que sobreviven son seis, no cuarenta.
- **Los ~32 colores de categorías, cuentas y metas son datos del usuario**, no
  tokens: viven en `categories.color`, `accounts.color` y `goals.color`. No se
  pueden centralizar y no se deben — son cómo el usuario distingue lo suyo.

**Ruta de migración cuando llegue la marca** (la de menor riesgo es no migrar):
extender `S`, que ya existe y ya se consume. Primero agregar `T` (tipografía),
`SP` (espaciado) y `R` (radios) con los valores **extraídos de lo que ya está
en pantalla**, para que ese paso no cambie un pixel; después una vista completa
a la vez, empezando por Dashboard.

## Arquitectura de información — decidida, no construida

Se decide **antes** de contratar: el diseñador necesita saber cuántas pantallas
son y cuáles. Se construye **una sola vez**, cuando llegue la dirección visual
— implementarla hoy es reescribir Dashboard para volverlo a reescribir.

**De seis pestañas a cuatro:** Inicio · Créditos · Asesor · Movimientos.

- **Cuentas deja de ser pestaña.** `src/views/Cuentas.tsx` (39 líneas) es casi
  el mismo componente que la tarjeta "Mis cuentas" del Dashboard; solo agrega
  "N transacciones". Es redundancia, no jerarquía.
- **Presupuestos baja a drill-down** desde una barra de total en Inicio.
- **Metas de ahorro NO baja del todo:** en Inicio queda la más cercana a
  cumplirse. Es el objeto motivacional y hay 0 metas creadas — no está sin usar
  por estar visible de más.
- **Movimientos fijos se mudan a Perfil.** Hoy viven en Metas (`Metas.tsx:53`)
  y es fácil olvidarlos al reacomodar.
- **No renombrar Créditos a "Deudas":** la app modela hipoteca y auto, que son
  créditos; y el diferenciador se llama tarjeta de crédito mexicana.

**Orden de Inicio:** patrimonio neto (número y delta) · ritmo del mes en una
línea · lo que urge (pagos próximos + avisos) · **recientes** · presupuesto
total · cuentas colapsado · la meta más cercana.

**Hallazgos del Dashboard actual, para que no se repitan:**

- **Patrimonio neto no está enterrado** — es la segunda tarjeta
  (`Dashboard.tsx:88-125`), con delta y gráfica. Lo que sobra es el hero de
  "Saldo Total" que **repite el número que ya está en el header**
  (`App.tsx:706`). El arreglo es borrar el duplicado, no subir el patrimonio.
- **El ritmo del mes ya existe completo** ("Cierre de mes estimado",
  `Dashboard.tsx:128-158`). El problema es que son cuatro cifras donde basta
  una frase.
- **"Próximos pagos" ya está a 7 días** (`api.getUpcoming(7)`), pero **solo
  cubre `recurring_rules`, no los días de corte y pago de los créditos**, que
  viven en un banner aparte. La mitad que falta es justo el diferenciador.
- **La gráfica de patrimonio (200px), la dona, la comparativa mes a mes y el
  selector de período** bajan a un "Análisis del mes". Ojo: hoy el selector de
  período gobierna *todas* las cifras de abajo, así que quitarlo de Inicio es
  decidir que Inicio es "este mes".

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
- `npm test`: 60 pruebas unitarias, más un `it.fails` esperado (los datos del
  responsable en `legal.ts`, que se pone verde al llenarlos).
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

- **Multi-moneda completa** — el arreglo de fondo. Ver el paso 0; hoy está
  contenido ocultando el selector de moneda, no resuelto.
- **La cola offline solo cubre gastos e ingresos.** Transferencias, pagos y
  abonos fallan sin red en vez de encolarse.
- **Chequeo de versión en la PWA de iOS.** No es lo que parecía: la navegación
  del service worker es red-primero (`public/sw.js:53-66`), así que cualquier
  recarga trae el bundle nuevo — nadie se queda pegado. Lo que sí pasa es que
  una PWA de iOS en standalone puede tardar mucho en volver a navegar, y ahí sí
  se sienta sobre JS viejo. Detalle aparte: `VERSION` está fijo en
  `"millions-v2"` y nadie lo sube al desplegar, así que la caché de assets
  nunca se purga (crece con los deploys, con archivos hasheados; inofensivo).
- **Recibos en Storage.**
- **Recordatorios por correo** (pospuesto; `pg_cron` listo, falta proveedor).

## 🧾 El ledger de migraciones no cuadra con la base

Encontrado el 1 de septiembre al aplicar la 0015. No rompe nada hoy, pero
levantar el proyecto desde cero saldría distinto a lo que hay en producción:

- **La 0014 no está registrada** en `supabase_migrations`. Sus columnas y su
  cron están vivos —verificado—, así que se aplicó con SQL suelto en vez de
  como migración. Falta registrarla.
- **`0006_recurring_service_grant` está en la base pero NO en el repo.** Es al
  revés que la anterior: se aplicó algo que no quedó en control de versiones y
  hoy nadie sabe exactamente qué hace sin ir a leerlo de la base.

## 🚫 Descartado

- **Modo equipo / espacios compartidos.** Millions es de finanzas personales; el
  multi-tenant traería una tabla `workspaces` y reescribir todas las políticas
  RLS a cambio de nada que se use.
- **"Leaked password protection" de Supabase.** Requiere plan Pro y el proyecto
  está en Free. El advisor de seguridad seguirá marcándolo.
- **Sincronización bancaria.** Ver hallazgo 1 del análisis de mercado.
