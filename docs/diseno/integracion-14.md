# Millions · Integración del diseño aprobado

Implementación del 7 de septiembre de 2026 sobre `Jeshualapizco1/millions-app`, base `19242460a29f40fae3fa4ad2727325383ae05613`, rama `codex/integracion-diseno-millions`.

Se trasladó la revisión 14 del estudio a los componentes React que usa la app real. El prototipo conserva su identidad y sus cambios posteriores; no se reemplazó por estos archivos. Esta entrega no está desplegada, no modifica datos de producción y no crea una nueva app paralela.

## Qué está integrado

| Área | Comportamiento implementado | Código principal |
|---|---|---|
| Sistema | Carbón y azul; Manrope y DM Sans locales con licencias; superficies por capas; radios y escala compartidos | `constants.ts`, `design.css`, `public/fonts/` |
| Apariencia | Tema oscuro/claro persistido en el dispositivo, estado del sistema nativo y hápticos opcionales | `appearance.ts`, `native.ts`, `Perfil.tsx` |
| Inicio | Saldo registrado principal, una atención prioritaria, ingresos/gastos del mes, tres movimientos recientes y accesos de primer uso | `Dashboard.tsx`, `presentation.ts` |
| Navegación | Inicio / Actividad / Mi dinero / Planes; asistente y Perfil en cabecera; sin logo en vistas de uso diario | `App.tsx` |
| Actividad | Movimientos con filtros desplegables; Análisis mensual, seis meses comparables, gastos por categoría y tablas con cifras exactas | `Historial.tsx`, `Analisis.tsx`, `MonthlyChart.tsx` |
| Asistente | Conversación real por el servicio existente, pregunta sobre el mes seleccionado y acciones que exigen confirmación | `Asistente.tsx`, `useAI.ts` |
| Mi dinero | Añadir/editar cuentas; tarjetas, hipoteca, auto, personal y otro; registrar pagos; patrimonio registrado y evolución estimada | `Cuentas.tsx`, `Creditos.tsx`, `CreditForm.tsx`, `Patrimonio.tsx` |
| Planes | Presupuestos / Metas / Fijos con los datos y operaciones existentes | `Metas.tsx` |
| Captura | + flotante abre opciones. Voz empieza con un gesto explícito. Texto y entrada manual disponibles. Revisión editable de descripción, monto, tipo, cuenta, categoría y fecha | `Fab.tsx`, `TxDraftChips.tsx`, `ManualTxModal.tsx` |
| Confirmación | Nada se escribe al interpretar. Fallar conserva el borrador. Confirmación duplicada bloqueada. Aviso de guardado con Deshacer | `useAI.ts`, `App.tsx` |
| Primera experiencia | Cinco preguntas existentes, preparación breve según prioridad, guía resultante, historias opcionales y configuración retomable desde Perfil | `Onboarding.tsx`, `Preparacion.tsx`, `journey.ts`, `Arranque.tsx` |
| Historias | Cuatro guiones navegables; soporte de video vertical, subtítulos, silencio inicial, pausa, siguiente/anterior y salto. Sin archivos de video se muestra una guía legible | `StoryViewer.tsx`, `STORY_MEDIA` |
| Cifras | Centavos exactos, números tabulares, negativos y cifras grandes; ocultación de importes en resúmenes y listas | `Money.tsx` |
| Diálogos | Diálogo nativo con fondo inerte, foco contenido, Escape/atrás sobre el superior, protección de cambios y de operaciones en curso | `Modal.tsx` |

Los formularios y la conversación del asistente conservan los importes que la persona necesita revisar, aunque los resúmenes estén ocultos. La preferencia de ocultación vive en la sesión de esa persona y se reinicia al cambiar de usuario.

## Integración de datos

Se reutilizan Supabase, la función de IA de Netlify y las RPC atómicas existentes. No se añaden tablas, migraciones, bibliotecas de UI ni estado global externo. La única lectura nueva es `getOnboarding()`, que recupera respuestas de `user_survey` para retomar el recorrido.

`jsdom` se añade únicamente como dependencia de desarrollo para probar los flujos React. Las versiones ya bloqueadas de dependencias existentes no cambiaron en `package-lock.json`.

Se mantienen PKCE, enlaces nativos, permisos de voz, límites de IA, revisión de acciones del asistente, cola offline, importación/exportación y puertas de legal/prueba. Su conservación en código no equivale a certificación en dispositivos ni a una prueba autenticada contra producción.

También se corrigieron fallos detectados al conectar el diseño:

- Crear una cuenta ya no reporta éxito si la operación falla; la confirmación por voz conserva el borrador en ese caso.
- Cerrar captura cancela la interpretación pendiente en la interfaz. Un resultado anterior no reemplaza una captura nueva. El texto permite reintentar.
- La sesión de voz se cierra al salir, ocultar la app o cerrar el panel. Las sesiones nativas se serializan; cancelar también libera una espera pendiente en `start()`.
- Los reintentos de configuración consultan cuentas y fijos actuales antes de crearlos. Saltar los pasos restantes conserva las cuentas ya elegidas.
- Los formularios de cuenta/crédito conservan datos cuando falla el servidor. Pagos y transferencias bloquean confirmaciones simultáneas y el cierre durante el guardado.
- Cerrar diálogos anidados no deja el scroll bloqueado.

## Movimiento

| Situación | Regla |
|---|---|
| Pulsación | 120 ms, desplazamiento de 1 px; sin rebote de cifras |
| Cambio de vista | Entrada de 180 ms y 7 px; foco en el título |
| Diálogo | Entrada 220 ms / salida 180 ms, recorrido corto |
| Gráficos | Actualización del gráfico existente, hasta 280 ms; no se animan importes desde cero |
| Escucha | Marca de cuatro trazos vinculada al estado del reconocedor; no afirma medir volumen del micrófono |
| Preparación | Tres pasos breves de 550 ms, omitibles; guía derivada de la prioridad, sin porcentajes falsos ni llamadas financieras simuladas |
| Historias | Progreso por tiempo real de video; pausa al ocultar la app; sin avance automático para la guía de texto |
| Movimiento reducido | CSS sin transiciones/animaciones, gráficos sin animación, preparación lista inmediatamente y videos sin reproducción/avance automáticos |
| Hápticos | Desactivados inicialmente; optativos desde Perfil, solo en Capacitor |

## Lo que aún impide llamarla versión lista para publicar

1. **Cuatro grabaciones propias y subtítulos.** No se recibieron videos: solo referencias y guiones. `STORY_MEDIA` está vacío deliberadamente. La guía textual funciona y es la alternativa de error/accesibilidad.
2. **Compras a crédito.** El modelo actual aplica gastos a `accounts`; `credits` registra deuda y sus pagos. Una compra con tarjeta necesita aumentar la deuda sin descontar efectivo y entrar una sola vez al análisis/presupuesto. No se ha fingido este soporte usando una cuenta como línea de crédito. La captura rechaza los casos explícitos detectados y conserva el texto; la detección no sustituye un modelo de datos completo.
3. **Validación visual y nativa.** El navegador de revisión no pudo acceder a la vista local. No se obtuvieron capturas nuevas ni se afirma haber validado visualmente la integración. Falta revisar 320/390/430 px, 200% de texto, teclado, VoiceOver/TalkBack y los cuatro estados de video con clips reales. La cancelación nativa está probada con un doble del plugin, no con un micrófono físico.
4. **Entorno autenticado de prueba.** Las pruebas de flujos usan API simulada; falta verificar lectura, escritura, reintentos, undo/offline y autenticación real contra un entorno de prueba. No se han usado datos ni credenciales de producción para esa prueba.
5. **Patrimonio y proyección son parciales.** Se presenta lo que el modelo real sabe: cuentas menos deuda y reconstrucción estimada. No hay catálogo de inmuebles/autos/otros activos. El cálculo existente de proyección usa fijos disponibles y puede sobreestimar al extrapolar gastos fijos ya ocurridos. No se presenta como dinero disponible garantizado.
6. **Figma.** Esta entrega implementa React. No se afirma que las 88 pantallas estén creadas en el archivo Figma ni se ha repetido el intento de cuota.

## Siguiente contrato para compras con tarjeta

La siguiente ampliación debe hacerse en una rama con base de prueba y migración registrada, siguiendo `CLAUDE.md`:

- Fuente inequívoca por id: cuenta de efectivo/débito o tarjeta; la línea de crédito nunca suma al saldo.
- Una RPC idempotente crea la compra y aumenta deuda en la misma transacción, con ownership/RLS y bloqueo de filas.
- Revertir/editar revierte la deuda y la compra atómicamente. Registrar el pago reduce deuda y efectivo sin duplicar gasto de consumo.
- Extender tipo de transacción, contexto de IA, captura/manual, presupuestos, análisis, importación y cola offline.
- Pruebas de compra → pago → reversión, concurrencia, corte, abonos parciales, fechas locales, falta de red y cuenta ajena antes de aplicar en producción.

## Validación de esta entrega

Resultados exactos y comandos en `validacion-14.md`. Las pruebas de interfaz usan React real y servicios simulados; los gráficos tienen pruebas de datos y tablas, pero no una inspección visual de Canvas.

## Uso con Claude Code

1. Actualizar la rama base y comprobar `git status`. Preservar cualquier trabajo posterior de la PC o Mac.
2. Trabajar en `codex/integracion-diseno-millions` o una rama de revisión equivalente. No copiar archivos encima de un checkout con cambios sin revisar.
3. Si se recibe el paquete, aplicar `millions-diseno-14.patch` sobre la base indicada. Si main avanzó, aplicar en una rama desde esa base y reconciliar el diff con main; no forzar el parche.
4. Ejecutar `npm install --no-audit --no-fund`, `npm test` y `npm run build` con las variables públicas ya configuradas en el entorno de prueba. La clave secreta de Supabase y la clave de IA nunca van en `VITE_*`.
5. Levantar con `npx netlify dev`. Revisar primero `/qa/index.html` (datos inventados, escrituras solo en memoria), luego `/` con una sesión de prueba.
6. Revisar y probar antes de aprobar un merge. Publicar requiere la decisión de Jeshua: main dispara Netlify y no se ha actualizado.
7. Para tiendas, después del build aprobado: `npx cap sync` y revisión en Xcode/Android Studio con los proyectos nativos existentes. No se cambiaron firma, dominios ni certificados.

El paquete incluye el parche binario (fuentes incluidas), los archivos modificados, los guiones, esta guía y el reporte. No incluye credenciales, `node_modules`, estado de usuario ni archivos `.env`.

## Orden de entrega

**V1:** esta integración sobre capacidades reales + revisión visual/nativa y de datos antes del lanzamiento.

**V1.5:** videos propios terminados y soporte contable completo para compras con tarjeta; este último debe adelantarse si la promesa de lanzamiento incluye “gasté con mi tarjeta Nu”. Corregir la base de la proyección antes de usarla para recomendaciones de dinero disponible.

**Futuro:** patrimonio con activos no líquidos, motion más elaborado que demuestre utilidad y nuevas variantes de onboarding basadas en evidencia de uso.
