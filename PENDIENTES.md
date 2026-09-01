# Pendientes

Lista viva. **Cada commit que cierra un punto lo borra de aquí en el mismo
commit.** Lo hecho vive en `git log`, no en este archivo. Ver la regla completa
en [CLAUDE.md](CLAUDE.md).

Origen: auditoría del 1 de septiembre de 2026 (código, base de producción y
advisors de Supabase) más la decisión de salir a App Store y Play Store.
Los puntos marcados **✔** se verificaron a mano en el código o en la base; los
demás vienen de revisión y hay que confirmarlos al abrirlos.

Orden de trabajo acordado: **A → B → G (fase 0 en paralelo) → C → D → E**. La
fase 0 de tiendas es trámites y esperas, así que arranca desde el primer día.

---

## A. Críticos — antes de abrir el registro a nadie

Cerrados A1–A7 el 1 de septiembre de 2026; el detalle vive en `git log`.

## B. Bugs medios

- [ ] **B7 Arranque guiado.** Cerrar la app en la pantalla de confeti reinicia
      las 5 preguntas (`App.tsx:163`, `faseArranque` es estado local);
      `terminarArranque` (`App.tsx:187-222`) duplica la regla "Nómina" al
      reintentar; `Onboarding.tsx:113` `onExplorar` y `Arranque.tsx:88` tragan
      el error. *Fix:* iniciar en `"configurar"` si `user_survey.completed`;
      buscar la regla por nombre+cuenta antes de crear; errores visibles.
- [ ] **B8 `import_transactions` no es idempotente.** `0008:8-55`: un reintento
      duplica hasta 2000 filas y su saldo. *Fix:* `id` opcional por fila con
      `on conflict (id) do nothing` sin tocar el saldo cuando no insertó.
- [ ] **B9 El asesor apaga el arrastre de un presupuesto.** `src/lib/api.ts:344`
      upsert con `rollover: p.rollover ?? false`; `actions.ts:95` nunca lo manda.
- [ ] **B11 Inyección de prompt con datos propios.** `chat.ts:255-283` interpola
      nombres y `dream` (2000 chars) sin delimitar. *Fix:* bloque `<datos>` con
      instrucción de tratarlo como datos; recortar `dream` a 300.
- [ ] **B12 Cuentas archivadas aceptan movimientos.** Ninguna RPC verifica
      `archived_at is null`; el snapshot las excluye y el patrimonio se desfasa.
- [ ] **B14 ✔ `authenticated` tiene `TRUNCATE`, `TRIGGER` y `REFERENCES` en
      las 15 tablas de `public`.** Viene del `grant all` por omisión de Supabase
      y `TRUNCATE` **no pasa por RLS**. PostgREST no expone `truncate`, así que
      hoy no es explotable desde la API, pero es privilegio sin uso. *Fix:*
      `revoke truncate, trigger, references on all tables in schema public from
      authenticated` más el `alter default privileges` correspondiente, en la
      misma migración que B13. (Encontrado al hacer A1; `profiles` ya quedó
      limpia en la 0017.)
- [ ] **B13 Advisors de Supabase.** 14 FKs sin índice (`transactions.category_id
      | credit_id | goal_id | recurring_id`, `recurring_rules.*`, `budgets.category_id`,
      `credit_payments.*`, `goal_contributions.*`) y 18 políticas con
      `auth.uid()` sin `(select ...)`. Una migración.

## C. Bugs bajos

- [ ] C1 `useAI.ts:100-101` prefill de cuenta con `includes`: "BBVA" cae en
      "BBVA Oro". Usar `findByName`; vacío si ambiguo.
- [ ] C2 `App.tsx:295-311` borrar/editar un movimiento aún en cola offline falla
      y reaparece al sincronizar.
- [ ] C3 `App.tsx:307-309, 511` recargas con `.catch(console.error)`: saldos
      obsoletos sin aviso. Usar `oops`.
- [ ] C4 `useVoice.ts:42-63` doble toque antes de `onstart` crea dos reconocedores.
- [ ] C5 `analytics.ts:105-107` un fijo con `due` hoy desaparece de la
      proyección después del mediodía si el cron no corrió.
- [ ] C6 `App.tsx:330,340` `parseFloat` de input vacío → `NaN` → rechazo de
      Postgres sin mensaje.
- [ ] C7 `transfer` entre monedas distintas mueve unidades sin convertir;
      rechazarlo mientras el selector de moneda esté apagado.
- [ ] C8 `update_transaction` pone `notes`/`category_id` en null si se omiten;
      `reverse_transaction` borra `completed_at` de la meta.
- [ ] C9 `apply_transaction` / `import_transactions` no validan que
      `p_category_id` / `p_recurring_id` sean del usuario (solo FK).
- [ ] C10 `ai_usage` con `on delete cascade`: purgar cuentas borra su gasto del
      mes y el freno global subestima. `on delete set null`.
- [ ] C12 `chat.ts:214` suma saldos sin convertir moneda (ya anotado en TODO).
- [ ] C13 `recurring_rules.next_run` sin mínimo: una regla con fecha de hace
      años genera 60 filas/día durante meses. CHECK o tope en el catch-up.

## D. Mejoras de funcionamiento

- [ ] **D1 Refresco al volver a la app.** `useFinanceData` carga una vez y nunca
      más; los recurrentes del cron de las 6:00 no aparecen hasta recargar.
      `visibilitychange` que recargue si pasaron > 5 min.
- [ ] **D2 Corte y pago de tarjetas dentro de "Próximos pagos".** Hoy
      `api.getUpcoming(7)` solo cubre `recurring_rules`; los créditos van en un
      banner aparte. Es el diferenciador del producto.
- [ ] **D5 Feedback de éxito y anti doble-tap.** `saveNewAcc`, `saveNewCredit`,
      `saveNewGoal`, `saveBudget`, `saveEditAcc` sin toast; `saveTxManual` sin
      `loading`.
- [ ] **D6 Deshacer genérico** para borrar transferencia/pago/abono, presupuesto,
      meta y crédito (hoy solo gasto/ingreso, `App.tsx:304`).
- [ ] **D7 `ManualTxModal` recuerda la última cuenta** (`App.tsx:672` resetea a "").
- [ ] D8 `nueva_cuenta` por voz guarda directo, sin borrador.
- [ ] D9 Paginación real de `getTxs()`: hoy trae todo el historial en el boot.

## E. Mejoras visuales

- [ ] **E1 Escala tipográfica y de radios en `constants.ts`.** Hay 27 tamaños
      entre 9 y 56 px (con 13.5, 14.5…) y 11 radios. Colapsar a `T` = 11/13/15/
      17/22/32 y `R` = 10/16/24, extraídos de lo que ya está en pantalla, y
      reemplazar. Primero sin cambiar un pixel visible; es la base para el
      rediseño del diseñador.
- [ ] **E2 Iconos SVG (Lucide inline) en tab bar y acciones** (`App.tsx:923`,
      `TxRow.tsx`, `Metas.tsx`, `Perfil.tsx`). Los emoji de categorías, cuentas
      y metas se quedan: son datos del usuario.
- [ ] **E3 Números tabulares:** `fontVariantNumeric: "tabular-nums"` en `fmt()`
      y en las cifras grandes `letterSpacing: -0.02em`.
- [ ] **E4 Contraste.** `C.muted` #6b6a8a sobre `C.card` da 3.3:1 y se usa a
      10–11 px. Subir a #8b8aa8; nada menor a 11 px; pestañas de 9 → 11 px.
- [ ] **E5 `Modal` de verdad:** Escape, `role="dialog"` + `aria-modal`, focus
      trap, bloqueo de scroll del body, `maxHeight: 92dvh` (no `vh`),
      confirmación antes de descartar un formulario con cambios. `Fab.tsx:61` igual.
- [ ] **E6 Inputs a 16 px.** `S.inp` está en 15 y Safari hace zoom; hay campos
      a 13 (`ImportCsvModal.tsx:76`, `Historial.tsx:104`) y 14 (`CreditForm.tsx:50`).
- [ ] **E7 Skeletons** en dashboard y gráficas (`Dashboard.tsx:10`, `App.tsx:771`);
      spinner en botones en vez de `"..."` (`AuthScreen.tsx:100`, `LegalGate.tsx:99`).
- [ ] **E8 Un solo saldo total.** Header (`App.tsx:853`) y hero del Dashboard
      repiten el número. Quitar el hero y poner el delta vs. mes anterior.
- [ ] **E9 Estilos duplicados fuera de `S`:** `AuthScreen.tsx:19`,
      `CreditForm.tsx:50` redefinen `inp`/`lbl`; botón Gasto/Ingreso copiado en
      `ManualTxModal.tsx:38`, `EditTxModal.tsx:62`, `RecurringModal.tsx:67`; caja
      de error copiada 9 veces. Un componente para cada uno.
- [ ] **E10 PWA/meta:** icono maskable con zona segura + 192 y 180 px,
      `theme-color` = `C.surface`, quitar `orientation: portrait`,
      `<meta name="color-scheme" content="dark">`.
- [ ] E11 Alerta de presupuesto lleva a "metas" donde presupuestos es la 2ª
      tarjeta; `autoFocus` en el paso 3 del arranque abre el teclado al entrar.

## F. Accesibilidad (cero `aria`, `htmlFor`, `h1`, `nav`, `main`, `focus-visible`)

- [ ] F1 `htmlFor` en todos los `<label style={S.lbl}>`.
- [ ] F2 `<div onClick>` → `<button>`: `Cuentas.tsx:22`, `Dashboard.tsx:255`,
      `Perfil.tsx:35`, `LegalGate.tsx:59`, `App.tsx:846,869`, `Metas.tsx:72,113`,
      `ImportCsvModal.tsx:150`, `AuthScreen.tsx:90,107`.
- [ ] F3 `focus-visible` global en `index.html`; `S.inp` fuerza `outline: none`
      sin sustituto.
- [ ] F4 Toasts con `role="status"` y `aria-live`; FAB con `aria-label`; tab bar
      con `aria-current`.
- [ ] F5 `prefers-reduced-motion` para `fadeUp`, `slideUp`, `pulse` en `index.html`.

---

## G. Migración a App Store y Play Store

### La decisión: Capacitor, no reescritura

Capacitor envuelve la app web actual en un contenedor nativo (WKWebView en iOS,
WebView en Android) y da acceso a APIs nativas por plugins. **Se conserva el
~95 % del código**: React, hooks, `lib/`, Supabase, la función de Netlify. Lo
que cambia es la capa de voz, la URL de la IA, los deep links, el cobro y el
empaque. React Native (Expo) daría mejor sensación nativa a costa de reescribir
las ~30 vistas y modales (unas 6 000 líneas de JSX); Flutter, reescribir todo.
Con un solo desarrollador y la lección de mercado del TODO (la distribución fue
el lever de MonAi, no el desarrollo), el tiempo a tienda manda. Se puede
migrar a Expo más adelante sin tirar `lib/`, `hooks/` ni el backend.

Riesgo conocido: Apple rechaza apps que "son un sitio web" (guía 4.2). Millions
tiene funcionalidad real, cola offline y voz; el riesgo se mitiga con splash,
barra de estado, safe areas, teclado y háptica nativos, y sin comportamientos
de navegador (zoom, selección de texto, rebote).

### Lo que cambia en el producto por las reglas de las tiendas

Estas decisiones afectan cosas ya tomadas en `TODO.md` y hay que resolverlas
**antes** de tocar código:

- [ ] **G-D1 El cobro tiene que pasar por Apple y Google.** Una suscripción que
      desbloquea funciones dentro de la app es "contenido digital": Apple
      (guía 3.1.1) y Google (política de pagos) exigen compra dentro de la app.
      El muro actual de `FinDePrueba` con "correo o enlace para contratar" es
      motivo de rechazo en iOS. *Decisión propuesta:* RevenueCat como capa
      única sobre StoreKit y Play Billing (`@revenuecat/purchases-capacitor`),
      con webhook a Supabase que escriba `subscriptions(user_id, status,
      expires_at, store)`. La PWA web puede seguir cobrando por fuera.
      Comisión: 15 % en ambas tiendas el primer millón de USD/año (Apple exige
      inscribirse al *Small Business Program*; Google lo aplica solo).
      A $149 MXN quedan ~$126 antes de impuestos.
- [ ] **G-D2 El programa A de referidos (15/40/100 % de descuento) no se puede
      implementar tal cual** con cobro en tienda: el precio lo fija la tienda y
      los descuentos son *offer codes* o *promotional offers* con reglas
      rígidas. *Alternativa que sí funciona:* recompensar con **meses gratis**
      vía *promotional entitlements* de RevenueCat (1 amigo = 1 mes, 2 = 3
      meses, 3 = 12 meses, por ejemplo). Se concede desde el servidor sin pasar
      por la tienda. Decidir la tabla y reescribir esa sección de `TODO.md`.
- [ ] **G-D3 Nombre en la tienda.** "Millions" a secas casi seguro está tomado
      en App Store (el nombre debe ser único). Decidir el nombre comercial, por
      ejemplo "Millions: Finanzas con IA", y el *bundle id* (propuesta:
      `mx.millionsapp.app`). Revisar que no choque con marcas registradas en
      el IMPI.
- [ ] **G-D4 Titular de las cuentas de desarrollador.** Persona física (a nombre
      de la responsable legal, María de Jesús Acosta García) u organización. La
      organización exige número D-U-N-S (gratis, 1–2 semanas) en Apple y Google.
      La persona física es inmediata, pero en Google el nombre legal y, si hay
      cobros, la dirección postal **se muestran en la ficha pública**.
- [ ] **G-D5 Captcha en la app nativa.** Turnstile valida por dominio; dentro
      del WebView el origen es `capacitor://localhost`. *Propuesta:* configurar
      `server.hostname = "app.millionsapp.com"` con esquema `https` en
      Capacitor y registrar ese dominio en Turnstile. Si no funciona, desactivar
      el captcha solo en nativo (las tiendas ya filtran bots).

### Fase 0 — Preparación sin código (empieza hoy; son trámites y esperas)

**Cuentas y dinero**

- [ ] Apple Developer Program: 99 USD/año. Enrolar en developer.apple.com con
      Apple ID + verificación de identidad; 1–2 días (persona) o hasta 2
      semanas (organización con D-U-N-S).
- [ ] Inscribirse al **App Store Small Business Program** en cuanto exista la
      cuenta (baja la comisión de 30 % a 15 %).
- [ ] Google Play Console: 25 USD una vez. Verificación de identidad y, para
      cuentas personales nuevas, **prueba cerrada obligatoria con al menos 12
      probadores durante 14 días** antes de poder publicar (confirmar la cifra
      vigente en el panel; era 20 hasta 2025). Esto fija el calendario: hay
      que reclutar a esos probadores desde ya.
- [ ] Cuenta bancaria y RFC para recibir pagos de Apple y Google; datos
      fiscales (formulario W-8BEN en Apple). Consultar con el contador cómo se
      declaran los ingresos de tienda.
- [ ] RevenueCat: cuenta gratis hasta 2 500 USD/mes de ingresos.

**Dominio y web (las tiendas lo exigen)**

- [ ] `millionsapp.com` tiene DNS pero no responde. Publicar una página mínima
      (puede ser Netlify, el mismo sitio) con: `/privacidad` y `/terminos`
      (los textos de `src/lib/legal.ts`), `/soporte` con `hola@millionsapp.com`,
      y `/.well-known/apple-app-site-association` para universal links.
- [ ] Correo `hola@millionsapp.com` funcionando de verdad (recibe y responde):
      es el contacto de soporte de la ficha y el de derechos ARCO.
- [ ] Mover la app de `millionsjeshua.netlify.app` a `app.millionsapp.com`.

**Herramientas en esta Mac (hoy solo hay Command Line Tools)**

- [ ] Xcode desde la App Store (~15 GB) y abrirlo una vez para aceptar la
      licencia. macOS 15 soporta Xcode 16.
- [ ] Android Studio + SDK + un emulador; JDK 17 (lo instala Android Studio).
- [ ] CocoaPods (`brew install cocoapods`) o usar Swift Package Manager desde
      Capacitor 6+.
- [ ] Un iPhone y un Android físicos para probar voz y micrófono: el emulador
      no sirve para eso.

**Legal y contenido**

- [ ] Revisión del aviso y términos por un abogado (ya pendiente en TODO).
      Añadir un párrafo sobre compras en tienda y renovación automática.
- [ ] Textos de permisos (van en la ficha y los lee Apple):
      `NSMicrophoneUsageDescription` ("Para registrar gastos con tu voz"),
      `NSSpeechRecognitionUsageDescription`.
- [ ] Formularios de privacidad: *App Privacy* en App Store Connect y
      *Data Safety* en Play. Datos que se recogen: correo, nombre, datos
      financieros que el usuario captura, texto de voz enviado a Anthropic,
      identificador de compra. Nada de rastreo publicitario.
- [ ] Cuenta demo con datos para el revisor de Apple (el registro está
      cerrado; sin credenciales de prueba rechazan).
- [ ] Assets: icono 1024×1024 sin transparencia (iOS), icono adaptativo
      (Android: capa frontal + fondo), splash, capturas de pantalla en iPhone
      6.7"/6.9" (5–8) y Android teléfono (2–8), descripción, subtítulo,
      palabras clave, categoría *Finanzas*, clasificación 4+.

### Fase 1 — Cerrar A1–A7 de la auditoría

Sin esto no conviene meter desconocidos, y los revisores de las tiendas son
desconocidos con tiempo. Está arriba en este archivo.

### Fase 2 — El contenedor (1–2 semanas)

- [ ] `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`,
      `npx cap init`, `npx cap add ios`, `npx cap add android`. `webDir: dist`.
      Los directorios `ios/` y `android/` van al repo.
- [ ] `VITE_API_BASE` para la función de IA: `src/lib/api.ts:99` usa
      `/.netlify/functions/chat` relativo; en nativo debe ser absoluto.
- [ ] **CORS en `netlify/functions/chat.ts`**: hoy no manda cabeceras porque
      era mismo origen. Permitir el origen de la app (`capacitor://localhost`,
      `https://localhost` o `https://app.millionsapp.com` según G-D5) y
      responder `OPTIONS`.
- [ ] **Voz nativa:** `@capacitor-community/speech-recognition`
      (SFSpeechRecognizer en iOS, SpeechRecognizer en Android, `es-MX`).
      `useVoice` elige el plugin cuando `Capacitor.isNativePlatform()` y
      conserva la API Web en la PWA. Es el cambio de código más grande.
- [ ] **Deep links para auth:** `emailRedirectTo` en `signUp` y en
      recuperación de contraseña apuntando a `mx.millionsapp://auth` (esquema
      propio) o a `https://app.millionsapp.com/auth` (universal link);
      registrar la URL en Supabase → Auth → Redirect URLs; manejar
      `appUrlOpen` de `@capacitor/app` y pasar los tokens a
      `supabase.auth.setSession`. Usar `flowType: 'pkce'`.
- [ ] Plugins de acabado: `@capacitor/status-bar` (oscura, `overlaysWebView`),
      `@capacitor/splash-screen`, `@capacitor/keyboard` (`resize: body`),
      `@capacitor/haptics` al confirmar movimientos, `@capacitor/app` para el
      botón atrás de Android (cerrar modal, no la app), `@capacitor/browser`
      para abrir aviso y términos.
- [ ] Sensación nativa: `user-select: none` fuera de inputs, `touch-action:
      manipulation`, sin zoom (`maximum-scale=1` solo en nativo), sin rebote.
- [ ] El service worker no aplica en nativo (los archivos son locales); dejarlo
      solo para la PWA. IndexedDB de la cola offline funciona igual.
- [ ] `ITSAppUsesNonExemptEncryption = false` en `Info.plist` (solo HTTPS).
- [ ] Probar en simulador de iOS, emulador de Android y en los dos teléfonos:
      login, confirmación de correo, voz, chips, offline, legal, borrado de
      cuenta.

### Fase 3 — Cobro (1 semana)

- [ ] Productos en App Store Connect y Play Console: suscripción mensual y
      anual en MXN (referencia: $149 / $1 420). Grupo de suscripción, prueba
      gratuita de 30 días como *introductory offer* de la tienda (sustituye al
      contador de `PRUEBA_DIAS` en nativo, o convive: el servidor manda).
- [ ] RevenueCat: proyecto, apps iOS/Android, *entitlement* `pro`, *offering*
      por defecto; SDK en el cliente con `Purchases.logIn(user.id)`.
- [ ] Webhook de RevenueCat → función de Netlify → tabla `subscriptions` en
      Supabase (RLS: el usuario solo lee la suya; escribe solo el service role).
- [ ] `FinDePrueba` en nativo muestra el *paywall* con los productos de la
      tienda, botón *Restaurar compras* (Apple lo exige) y enlace a términos.
      En web sigue el muro actual.
- [ ] Vaciar `PRECIO_TEXTO` / `CONTACTO_PAGO` de `legal.ts` o dejarlos solo
      para la PWA.
- [ ] Reescribir el programa A de referidos según G-D2.
- [ ] Probar compras en *sandbox* (Apple) y *license testers* (Google).

### Fase 4 — Pruebas en tienda (≥ 2 semanas por Google)

- [ ] TestFlight: build interna, luego externa con enlace público.
- [ ] Play: pista interna → **prueba cerrada con los 12+ probadores durante 14
      días** → solicitar acceso a producción.
- [ ] Registrar errores nativos: `client_errors` ya existe; añadir `platform`
      y `appVersion` al `context`.

### Fase 5 — Publicación

- [ ] Fichas completas en ambas tiendas; *App Review Information* con la
      cuenta demo y una nota explicando la voz y la IA.
- [ ] Enviar a revisión (Apple 1–3 días; Google 1–7). Preparar respuestas
      típicas: 4.2 funcionalidad mínima, 3.1.1 pagos, 5.1.1 borrado de cuenta
      (ya cumple), permisos de micrófono.
- [ ] Publicar. Apuntar `README.md` y `TODO.md` al nuevo estado.

### Fase 6 — Después (lo que la PWA no puede)

- [ ] Notificaciones push de corte y pago (`@capacitor/push-notifications` +
      FCM/APNs; un cron en Supabase que llame a una edge function). Cierra el
      punto del TODO que hoy sugiere el `.ics`.
- [ ] Actualizaciones en caliente del bundle web (Capgo, código abierto) para
      corregir sin pasar por revisión.
- [ ] Widget de saldo y atajo de Siri / acción rápida para "registrar gasto".

### Calendario realista

| Fase | Tiempo | Depende de |
|---|---|---|
| 0 | 1–2 semanas, en paralelo | Trámites, Xcode, dominio |
| 1 | 2–3 días | Nada |
| 2 | 1–2 semanas | Xcode y Android Studio instalados |
| 3 | 1 semana | Cuentas de tienda activas, productos creados |
| 4 | 2 semanas mínimo | Los 12 probadores de Google |
| 5 | 1 semana | Fichas y assets |

Seis a ocho semanas hasta estar en las dos tiendas, si la fase 0 arranca hoy.

### Costos

| Concepto | Costo |
|---|---|
| Apple Developer Program | 99 USD / año |
| Google Play Console | 25 USD una vez |
| RevenueCat | 0 hasta 2 500 USD/mes de ingresos |
| Capgo (opcional, fase 6) | ~12 USD / mes |
| Xcode, Android Studio, Capacitor | 0 |
| Comisión de tienda | 15 % de cada cobro |
