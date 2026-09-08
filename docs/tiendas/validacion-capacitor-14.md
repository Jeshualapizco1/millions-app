# Validación de Capacitor · diseño 14

8 de septiembre de 2026. Código compilado: `88751db0af0615c9c255bef207d75389f85537e2`.

[Ejecución y artefactos de GitHub](https://github.com/Jeshualapizco1/millions-app/actions/runs/34176876832).

| Comprobación | Resultado |
|---|---|
| Android, Ubuntu 24.04, Java 21, SDK 36 | Compilación correcta; generado `Millions-Android.apk` con firma de desarrollo |
| iOS, macOS 26, Xcode 26.6 | `BUILD SUCCEEDED`; app para simulador con CocoaPods y plugin de voz |
| Configuración | Proyecto real de Millions; origen de IA `https://app.millionsapp.io`; configuración del SHA exacto del Deploy Preview |
| Red real | Supabase Auth respondió correctamente; preflight de iOS y Android aceptados; API de IA sin sesión respondió 401 |
| Bundle nativo | Copiados diseño, fuentes locales y configuración; Capacitor carga archivos locales, sin `server.url` ni `server.hostname` |
| CI de React | Pruebas, TypeScript, build y escaneo de secretos correctos |
| Pruebas locales | 168 pruebas de Vitest y 5 pruebas de configuración aprobadas; permanece 1 fallo esperado preexistente |
| Datos del usuario | No se inició sesión ni se leyeron o escribieron movimientos del usuario durante esta validación |
| Dispositivos físicos | Pendiente; compilar no prueba permisos de voz, teclado ni guardado con sesión en un teléfono |
| Firma para iPhone/TestFlight | Pendiente del equipo Apple, certificados/perfiles y la Mac del usuario |
| Producción web | Este trabajo sigue en el PR; no se fusionó con main |

## Descargas de esta ejecución

En la sección **Artifacts** de la ejecución:

- **Millions-android-2**, artefacto `10037601795`: contiene el APK, el informe sin claves y el log. SHA-256 del ZIP de GitHub: `8cb5cbed606c8a912a253c85d91bf542058cf329aa93c5dd69506b4d1ded0a1b`.
- **Millions-ios-2**, artefacto `10037575789`: contiene la app para simulador, el informe y el log. SHA-256 del ZIP de GitHub: `c25eaf1a77fa3ea385b99e60398cbc217778eb5dd4e4ed61f7ff759c4fcaf295`.

GitHub indicó retención hasta el 22 de septiembre de 2026. El código y los comandos para reconstruir los paquetes quedan en el repositorio; [guía de compilación e instalación](capacitor-datos-reales.md).

El primer intento de Android falló antes de compilar porque `sdkmanager` no estaba en PATH. Se corrigió comprobando el SDK 36 ya instalado en la imagen oficial; la segunda ejecución completó ambas plataformas.

El APK usa datos reales después de iniciar sesión. Es un paquete de desarrollo para instalación y validación, no una publicación en Play Store. La app de simulador de iOS no se puede instalar directamente en un iPhone.
