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

Lo que **no** está en el plan actual vive en
[IDEAS-FUTURAS.md](IDEAS-FUTURAS.md): ideas guardadas para después, que no se
trabajan hasta pasar por aquí.

**Estado al 2 de septiembre, tarde:** A–F cerradas. **Las dos plataformas
compilan en la Mac**: iOS pasó de SPM a CocoaPods (SPM dejaba fuera el plugin
de voz) y Android da APK con JDK 21. A–F cerradas; quedan B15 (del advisor) y
H1 (multi-moneda), ninguno urgente. Lo demás es lo de fase 0, que es trámite
tuyo, y lo único que ya no se puede hacer desde aquí: **probar en teléfonos
reales**, empezando por la voz. Empieza por "Para retomar" en
[TODO.md](TODO.md).

---

## A. Críticos — antes de abrir el registro a nadie

Cerrados A1–A7 el 1 de septiembre de 2026; el detalle vive en `git log`.

## B. Bugs medios

Cerrados B1–B14 el 1 de septiembre de 2026; el detalle vive en `git log`.

- [ ] **B15 Tres funciones de trigger están publicadas como RPC.**
      `validate_transaction_refs()`, `pause_rules_of_archived_account()` y
      `reject_archived_account()` son `SECURITY DEFINER` y viven en `public`,
      así que Supabase las expone en `/rest/v1/rpc/...` para `anon` y para
      `authenticated`; el advisor de seguridad las marca. Llamarlas sueltas
      revienta —fuera de un trigger no hay `new`— pero una función con los
      privilegios de su dueño colgando de la API pública no se deja ahí. La
      cura es la de la 0028: `security invoker` y `revoke all on function ...
      from public, anon, authenticated`. Sale del advisor del 3 de septiembre,
      al crear `subscriptions`.

## C. Bugs bajos

Cerrados C1–C13 el 1 de septiembre de 2026; el detalle vive en `git log`.

## D. Mejoras de funcionamiento

Cerradas D1–D10 el 1 y 2 de septiembre de 2026; el detalle vive en `git log`.

## E. Mejoras visuales

Cerrados E1–E11 el 1 de septiembre de 2026; el detalle vive en `git log`.

## F. Accesibilidad (cero `aria`, `htmlFor`, `h1`, `nav`, `main`, `focus-visible`)

Cerrados F1–F5 el 1 de septiembre y F6 el 3; el detalle vive en `git log`.

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
- [x] **G-D2 Referidos con meses gratis — decidido el 3 de septiembre.** El
      programa A de `TODO.md` (15/40/100 % de descuento) no se podía
      implementar con cobro en tienda: el precio lo fija la tienda y los
      descuentos son *offer codes* o *promotional offers* con reglas rígidas.
      Se recompensa con **meses gratis**, que se conceden desde el servidor
      con *promotional entitlements* de RevenueCat sin pasar por la tienda:

      - El invitado estrena con **1 mes gratis** al suscribirse.
      - Quien invita gana **1 mes gratis cuando al invitado se le hace su
        primer cargo real**, es decir al renovar después de ese mes gratis.
        No al suscribirse: ese primer mes no se cobra, así que premiarlo ahí
        sería regalar meses por registros que nunca pagan.
      - **Tope de 12 meses gratis al año** por persona.

      Queda por implementar en la fase 3, y sigue abierto cómo convive el mes
      gratis del invitado con la prueba de 30 días (ver la nota al final de la
      fase 3).
- [x] **G-D3 Nombre en la tienda — decidido el 1 de septiembre.** Nombre
      comercial **"Millions - Finanzas con IA"** y dominio **`millionsapp.io`**
      (el `.com` se abandona). Bundle id propuesto por el dominio en orden
      inverso: **`io.millionsapp.app`**. Queda por revisar que el nombre no
      choque con marcas registradas en el IMPI.
- [ ] **G-D4 Titular de las cuentas de desarrollador.** Persona física (a nombre
      de la responsable legal, María de Jesús Acosta García) u organización. La
      organización exige número D-U-N-S (gratis, 1–2 semanas) en Apple y Google.
      La persona física es inmediata, pero en Google el nombre legal y, si hay
      cobros, la dirección postal **se muestran en la ficha pública**.
- [ ] **G-D5 Captcha en la app nativa.** Turnstile valida por dominio; dentro
      del WebView el origen es `capacitor://localhost`. *Propuesta:* configurar
      `server.hostname = "app.millionsapp.io"` con esquema `https` en
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

- [ ] El dominio es **`millionsapp.io`** (decidido el 1 de septiembre; el
      `.com` tenía DNS y no respondía). **Las
      páginas ya existen en el sitio de Netlify**: `/privacidad`, `/terminos`
      y `/soporte` se sirven sin sesión desde `src/views/Publica.tsx`, con el
      mismo texto de `src/lib/legal.ts` (antes daban 404: faltaba el fallback
      de SPA en `public/_redirects`). Falta apuntar el dominio al sitio en el
      panel de Netlify. `/.well-known/apple-app-site-association` espera al
      Team ID y al bundle id (G-D3, G-D4).
- [ ] Correo de soporte y ARCO funcionando de verdad (recibe y responde).
      El aviso publica `hola@millionsapp.io` desde la versión `2026-09-01.3`:
      es el contacto de soporte de la ficha y el de derechos ARCO.
- [ ] Mover la app de `millionsjeshua.netlify.app` a `app.millionsapp.io`.

**Herramientas en esta Mac**

- [x] **Herramientas de compilación, listas en la Mac** (2 de septiembre):
      Xcode 26.6 y CocoaPods 1.17 para iOS; para Android, JDK **21** (no 17:
      Capacitor 8 falla con `invalid source release: 21`), las command line
      tools del SDK por Homebrew en
      `/opt/homebrew/share/android-commandlinetools`, y de ahí
      `platform-tools`, `platforms;android-36` y `build-tools;36.0.0`. Las dos
      plataformas compilan; los comandos exactos están en el README.
- [ ] Android Studio, solo si quieres emulador y depuración visual: para
      compilar no hace falta. Se instaló con `brew install --cask
      android-studio`; falta abrirlo una vez y crear un AVD.
- [ ] Un iPhone y un Android físicos para probar voz y micrófono: el emulador
      no sirve para eso.

**Legal y contenido**

- [ ] Revisión del aviso y términos por un abogado (ya pendiente en TODO).
      Añadir un párrafo sobre compras en tienda y renovación automática.
- [ ] Textos de permisos, formularios de privacidad, descripción, subtítulo y
      palabras clave: **borrador listo en `docs/tiendas/ficha.md`**. Falta
      revisarlo y pegarlo en los paneles cuando existan las cuentas.
- [ ] Cuenta demo para el revisor: **`supabase/scripts/seed-demo.mjs`**, probado
      contra producción (tres meses de datos, sin portón ni arranque). Se corre
      con `DEMO_EMAIL` y `DEMO_PASSWORD` por variables de entorno cuando se
      tenga la fecha de revisión; la contraseña no va al repo.
- [ ] Assets: **generados en `docs/tiendas/assets/`** el icono iOS de 1024 sin
      transparencia, el adaptativo de Android (capa frontal + color de fondo)
      y el splash de 2732. Faltan las **capturas de pantalla** (iPhone
      6.7"/6.9", 5–8; Android, 2–8): se toman desde el dispositivo cuando
      exista el contenedor.

### Fase 1 — Cerrar A1–A7 de la auditoría ✅ HECHA el 1 de septiembre

Un commit por punto (A2 y A3 comparten uno porque tocan la misma función):
`bab905d` A1 · `a1480b5` A2+A3 · `7e51525` A4 · `d59090d` A5 · `1ca14f0` A6 ·
`2071ed0` A7. Todos en `origin/main`, verificados contra producción.

### Fase 2 — El contenedor 🔨 COMPILAN LAS DOS, FALTA PROBAR EN TELÉFONO

Escrito el 1 de septiembre en Windows, **compilado por primera vez el 2 en la
Mac**: `xcodebuild` sobre `App.xcworkspace` termina en `BUILD SUCCEEDED` para
simulador, y `./gradlew assembleDebug` produce el APK. Ninguno de los dos se ha
ejecutado todavía en un aparato.

- [x] Capacitor 8 con `android/` e `ios/` generados, `webDir: dist`, bundle id
      `io.millionsapp.app`, nombre "Millions - Finanzas con IA". Iconos y
      splash nativos generados con `@capacitor/assets` desde `assets/`.
- [x] **iOS usa CocoaPods, no SPM.** El proyecto que salió de Windows se generó
      con Swift Package Manager, y `@capacitor-community/speech-recognition` no
      trae `Package.swift`: quedaba fuera del binario, así que en iOS el
      micrófono no habría hecho nada. Regenerado el 2 de septiembre con
      `npx cap add ios --packagemanager CocoaPods`; los 6 plugins entran y
      `CapacitorCommunitySpeechRecognition.framework` está en el bundle. Se
      abre `ios/App/App.xcworkspace`, **no** el `.xcodeproj`. De paso entraron
      los métodos `open url` y `continue userActivity` del `AppDelegate`, que
      la plantilla de Windows tampoco tenía: sin ellos los deep links de auth
      y los Universal Links no llegaban a la app.
- [x] `server.hostname = app.millionsapp.io` con esquema https (G-D5): el
      origen dentro del WebView es el dominio público.
- [x] `VITE_API_BASE` para la función de IA (`src/lib/native.ts`); CORS y
      `OPTIONS` en `chat.ts` para los orígenes del contenedor.
- [x] Voz nativa con `@capacitor-community/speech-recognition` cuando
      `Capacitor.isNativePlatform()`; la PWA conserva la API Web. Se detiene
      sola tras 1.6 s de silencio para imitar `continuous: false`.
- [x] Deep links de auth: PKCE en el cliente, `emailRedirectTo` a `/auth`,
      `appUrlOpen` cambia el `code` por sesión; intent filter de App Links en
      Android; `public/.well-known/` con AASA y assetlinks (con marcadores).
- [x] Status bar oscura sobre la vista, splash, teclado `resize: body`,
      háptico al confirmar un borrador, botón atrás de Android cierra el
      diálogo abierto o manda la app al fondo. `user-select: none` y
      `touch-action` solo con `<html class="nativo">`. Service worker solo en
      la PWA. `ITSAppUsesNonExemptEncryption = false`, permisos de micrófono
      y reconocimiento en `Info.plist`, `RECORD_AUDIO` en Android, solo
      vertical en iPhone.

Falta, y es en tu máquina o en paneles:

- [x] **Android compila** (2 de septiembre): `./gradlew assembleDebug` da un
      APK de 4.7 MB con `io.millionsapp.app`, el nombre de tienda,
      `RECORD_AUDIO` y `VIBRATE`, y la build web dentro. El `gradlew` venía sin
      permiso de ejecución (salió de Windows); se corrigió también en el índice
      de git con `git update-index --chmod=+x`.
- [ ] **Primer build de iOS con firma**: hasta ahora solo se compiló para
      simulador con `CODE_SIGNING_ALLOWED=NO`. Para el teléfono hace falta la
      cuenta de Apple (fase 0) y elegir el equipo en Xcode.
- [ ] **Xcode → Signing & Capabilities → Associated Domains**:
      `applinks:app.millionsapp.io`. Y rellenar `TEAMID` en
      `public/.well-known/apple-app-site-association`.
- [ ] **Huella SHA-256 del keystore** en `public/.well-known/assetlinks.json`
      (`keytool -list -v -keystore ...`). Sin ella Android abre el navegador.
- [ ] **Supabase → Auth → Redirect URLs**: `https://app.millionsapp.io/auth` y
      `https://millionsjeshua.netlify.app/auth`.
- [ ] Mientras `app.millionsapp.io` no apunte al sitio, compilar nativo con
      `VITE_API_BASE=https://millionsjeshua.netlify.app`.
- [ ] Probar en simulador de iOS, emulador de Android y en los dos teléfonos:
      login, confirmación de correo por deep link, voz (permisos, parciales,
      corte por silencio), chips, offline, legal, borrado de cuenta, botón
      atrás. La voz nativa está escrita a ciegas y nunca se ha ejecutado: es lo
      primero que hay que probar en un teléfono real. Ahora avisa cuando falla
      (`src/lib/voz.ts`), así que un permiso negado se ve en pantalla y no hay
      que adivinar desde el Xcode.
- [ ] `@capacitor/browser` no se agregó: aviso y términos ya viven dentro de
      la app y en `/privacidad` y `/terminos`.

### Fase 3 — Cobro (1 semana)

- [ ] Productos en App Store Connect y Play Console: suscripción mensual y
      anual en MXN (referencia: $149 / $1 420). Grupo de suscripción, prueba
      gratuita de 30 días como *introductory offer* de la tienda (sustituye al
      contador de `PRUEBA_DIAS` en nativo, o convive: el servidor manda).
- [ ] RevenueCat: proyecto, apps iOS/Android, *entitlement* `pro`, *offering*
      por defecto; SDK en el cliente con `Purchases.logIn(user.id)`.
- [ ] **Webhook de RevenueCat → función de Netlify.** La tabla
      `subscriptions` ya existe (migraciones `0027` y `0028`, aplicadas el 3
      de septiembre): una fila por persona y permiso, con el vocabulario de
      RevenueCat sin traducir, `expires_at` y `will_renew` separados de
      `status` —una suscripción cancelada sigue vigente hasta que expira—, RLS
      forzado y una sola política de lectura de lo propio. **El cliente no
      puede escribir**: sin política de insert ni update, RLS niega, así que
      nadie se pone `active` con la llave pública. Falta la función que reciba
      el webhook, valide su firma y haga el upsert con el service role.
- [ ] `FinDePrueba` en nativo muestra el *paywall* con los productos de la
      tienda, botón *Restaurar compras* (Apple lo exige) y enlace a términos.
      En web sigue el muro actual.
- [ ] Vaciar `PRECIO_TEXTO` / `CONTACTO_PAGO` de `legal.ts` o dejarlos solo
      para la PWA.
- [ ] Implementar los referidos con meses gratis según **G-D2**, que ya está
      decidido: tabla `referrals`, código de invitación por persona, y el mes
      se concede como *promotional entitlement* de RevenueCat cuando entra el
      primer cargo real del invitado. El tope de 12 al año se cuenta en el
      servidor, no en el cliente.
- [ ] **Decidir cómo conviven el mes gratis del invitado y la prueba de 30
      días.** Tal como están escritos hoy se suman: alguien invitado entraría
      con la prueba de la tienda más el mes de G-D2, casi dos meses antes del
      primer cargo. Las salidas son excluirlos (quien llega por invitación no
      recibe la prueba), encadenarlos a propósito, o bajar la prueba a 14 días
      para los invitados. Afecta al *introductory offer* de la tienda, así que
      hay que resolverlo **antes** de crear los productos.
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

---

## H. Multi-moneda de fondo — bloqueante para salir de México

- [ ] **H1 `Transaction` no guarda su moneda.** Sin fecha: no estorba mientras
      el producto viva en México, y por eso el selector de moneda está apagado
      con `SELECTOR_DE_MONEDA_ACTIVO` en `src/lib/currency.ts`. **Es
      bloqueante para la expansión regional**: `sumSpend`/`sumIncome` suman
      números sin preguntar de qué moneda son, así que un usuario colombiano
      vería sus pesos sumados con los mexicanos como si fueran lo mismo. Hace
      falta que cada movimiento guarde su moneda y su tipo de cambio del día,
      y que los totales conviertan a la moneda base de la persona. Ver la
      sección 3 de [IDEAS-FUTURAS.md](IDEAS-FUTURAS.md), donde la expansión
      depende de esto.
