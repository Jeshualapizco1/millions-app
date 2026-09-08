# Capacitor con la cuenta real

El diseño de la rama de integración usa el mismo cliente de Supabase y las mismas RPC que la app existente. El proyecto es Millions, referencia `wliksgpzgfidvakjubdu`; la API de IA es `https://app.millionsapp.io/.netlify/functions/chat`. Iniciar sesión es lo que permite ver los datos de cada persona. No se copian movimientos a una base nueva ni se introducen datos de ejemplo en el paquete nativo.

## Configuración

Cada build genera `dist/client-config.json` con seis campos públicos: versión del formato, identificador de app, commit, URL de Supabase, llave publishable/anon y origen de IA. Son los mismos valores públicos presentes en el JavaScript que ya descarga cualquier instalación. La generación rechaza llaves de servidor. Las claves privadas de Supabase y Anthropic permanecen en el servidor.

El comando nativo puede usar el `.env` existente en la Mac/PC o leer ese JSON del despliegue aprobado. Nunca sobrescribe el `.env`. Rechaza URLs de ejemplo, otro proyecto, un origen de IA diferente o una vista previa que no corresponda al commit esperado.

Antes de compilar comprueba Auth y los preflight de iOS/Android, además de verificar que la API de IA exige sesión. Solo hace GET/OPTIONS: no registra, borra o modifica cuentas, movimientos o respuestas del onboarding y no gasta una consulta del asistente.

## En la Mac o PC de Jeshua

Primero guarda el trabajo local con Claude Code y actualiza la rama de integración conservando tus cambios. Una vez que el PR se fusione, usa `main`.

```bash
npm install --no-audit --no-fund
npm test
```

Con el `.env` real que ya usas en esa máquina:

```bash
npm run native:prepare -- check
npm run native:android
npm run native:ios
```

Android requiere JDK 21 y SDK 36. `native:android` compila el frontend, sincroniza Capacitor y genera `android/app/build/outputs/apk/debug/app-debug.apk`.

iOS requiere macOS, Xcode y CocoaPods. `native:ios` compila el frontend, sincroniza los pods y abre el workspace correcto en Xcode. Ahí selecciona el iPhone conectado y tu equipo de firma y ejecuta Run. Se conservan el bundle ID, los permisos y el proyecto existentes. No regeneres la plataforma con SPM: dejaría fuera el plugin de voz.

Si falta el `.env`, la configuración se puede tomar del despliegue del PR:

```bash
npm run native:android -- --config-url https://deploy-preview-1--millionsjeshua.netlify.app/client-config.json
npm run native:ios -- --config-url https://deploy-preview-1--millionsjeshua.netlify.app/client-config.json
```

Después de fusionar y publicar el nuevo código, también estará disponible `https://app.millionsapp.io/client-config.json`.

## Compilación en GitHub

El workflow **Capacitor con backend real** corre en el PR para Android e iOS. Espera la configuración del Deploy Preview correspondiente al SHA exacto y compila el código de ese SHA con Node 22; Android usa Java 21.

En Actions → ejecución → Artifacts:

- **Millions-android-N:** APK con firma de desarrollo y el backend real, informe de configuración sin claves y log de compilación.
- **Millions-ios-N:** app para simulador, informe y log. Esta app de simulador no es un IPA instalable en iPhone ni una publicación en TestFlight.

La firma de desarrollo del APK de GitHub puede ser distinta de la usada en tu Mac. Si Android rechaza la actualización por firma, compila en la máquina que firmó tu instalación o utiliza la clave original. No desinstales una app con movimientos pendientes de sincronizar.

Para distribución en tiendas se necesitan las firmas y el proceso de publicación de Apple/Google. Compilar para simulador no los reemplaza. Aquí no se generan certificados ni se publican aplicaciones en las tiendas.

## Qué prueba y qué falta

Un build exitoso prueba la compilación de Capacitor, la inclusión del nuevo bundle, las fuentes y la configuración real. La comprobación de red prueba conectividad y CORS, no acceso a los datos de un usuario.

Falta verificar en un teléfono y con sesión: login, carga de cuentas/historial, registro manual, captura nativa, revisión, guardado único, cierre/reapertura, asistente y los casos de falta de red. No se usa un acceso administrativo para simular que alguien inició sesión.

Las compras que aumentan deuda de tarjeta, la proyección parcial y las grabaciones propias siguen en `PENDIENTES.md`. Los créditos y sus pagos existentes no equivalen a soporte contable completo de compras con tarjeta.
