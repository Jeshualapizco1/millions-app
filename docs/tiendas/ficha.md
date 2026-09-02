# Ficha de tienda y formularios — borrador

Textos listos para pegar en App Store Connect y Play Console. Lo que está
entre corchetes lo decides tú (ver G-D1 a G-D5 en PENDIENTES.md).

## Nombre y textos

| Campo | Texto |
|---|---|
| Nombre (30) | Millions - Finanzas con IA *(decidido; 26 caracteres)* |
| Subtítulo iOS (30) | Gastos por voz y tarjetas al día |
| Descripción corta Play (80) | Registra gastos hablando y entérate antes del corte de tu tarjeta. |
| Palabras clave iOS (100) | finanzas,gastos,presupuesto,tarjeta,credito,ahorro,voz,dinero,deudas,meta |
| Bundle id / applicationId | `io.millionsapp.app` (propuesto desde `millionsapp.io`) |
| Categoría | Finanzas |
| Clasificación | 4+ / Para todos |

### Descripción larga

Millions es la app de finanzas personales que se usa hablando. Toca el micrófono, di
"gasté 250 en el súper" y listo: queda registrado con cuenta y categoría, y antes de
guardar puedes corregir cualquier cosa con un toque.

Lo que hace por ti:

- Captura por voz o texto, con borrador editable antes de guardar. Sin conexión
  también: se envía solo cuando vuelve la red.
- Tarjetas de crédito como se usan en México: día de corte y día de pago, y te
  avisa antes, no después.
- Movimientos fijos (renta, nómina, suscripciones) que se registran solos.
- Presupuestos por categoría con arrastre, techo mensual y proyección de cierre.
- Patrimonio neto: cuentas menos deudas, con su historial.
- Metas de ahorro con abonos desde tus cuentas.
- Un asesor con inteligencia artificial que conoce tus números y responde en
  español, y que solo puede proponer acciones: tú confirmas cada una.
- Exporta todo a CSV cuando quieras. Tus datos son tuyos.

Millions no mueve dinero ni se conecta a tu banco: tú capturas, la app ordena.

## Permisos (iOS, van en Info.plist y los lee el revisor)

| Clave | Texto |
|---|---|
| NSMicrophoneUsageDescription | Para registrar tus gastos hablando. |
| NSSpeechRecognitionUsageDescription | Para convertir lo que dices en un movimiento que puedas revisar antes de guardar. |

## App Privacy (Apple) y Data Safety (Google)

Respuesta honesta según lo que la app recoge hoy. **No hay rastreo publicitario ni SDKs de terceros que recojan datos.**

| Dato | Se recoge | Vinculado a la identidad | Uso | Se comparte con |
|---|---|---|---|---|
| Correo electrónico | Sí | Sí | Cuenta / inicio de sesión | Supabase (procesador, EE. UU.) |
| Nombre | Sí (opcional) | Sí | Personalización | Supabase |
| Información financiera (saldos, movimientos, deudas, presupuestos, metas) | Sí | Sí | Funcionalidad de la app | Supabase; **resumen** a Anthropic solo al usar el asesor |
| Texto de voz / consultas al asistente | Sí | Sí | Funcionalidad de la app | Anthropic (procesador, EE. UU.); no se usa para entrenar modelos |
| Compras en la app / estado de suscripción | Sí *(cuando exista)* | Sí | Funcionalidad | RevenueCat *(G-D1)* |
| Diagnóstico (errores de la app) | Sí | Sí | Funcionalidad de la app | Supabase (tabla client_errors) |
| Identificadores de dispositivo, ubicación, contactos, fotos, historial de navegación | **No** | — | — | — |

Encriptación en tránsito: sí (HTTPS). El usuario puede pedir el borrado: sí, desde la
app (Perfil → Borrar mi cuenta, 30 días de gracia) y por correo a hola@millionsapp.io.

## Cuenta de revisión

Se crea con `supabase/scripts/seed-demo.mjs` (correo y contraseña por variables de
entorno; tres meses de datos creíbles, portón legal y arranque ya pasados). Las
credenciales van en *App Review Information → Sign-in required*, nunca en el repo.

## Assets generados (docs/tiendas/assets)

| Archivo | Para |
|---|---|
| ios-icon-1024.png | App Store Connect, icono sin transparencia |
| android-adaptive-foreground-432.png + android-adaptive-background.txt | Icono adaptativo Android: capa frontal + color de fondo |
| splash-2732.png | Splash universal de Capacitor |
| preview-android-circle.png | Solo para ver cómo queda bajo máscara circular |

Faltan y no se pueden generar desde aquí: **capturas de pantalla** (iPhone 6.7"/6.9",
5–8; Android teléfono, 2–8). Se toman desde el dispositivo cuando exista el contenedor.
