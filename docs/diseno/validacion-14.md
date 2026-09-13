# Validación · integración 14

Validación inicial del 7 de septiembre de 2026. Pruebas, build, escaneo de secretos y base remota comprobados de nuevo el 8 de septiembre antes del commit y del PR autorizados por Jeshua. Base: `19242460a29f40fae3fa4ad2727325383ae05613`.

| Comprobación | Resultado |
|---|---|
| `npm test` | 168 pruebas pasan, 1 fallo esperado preexistente; 6 archivos |
| Prueba preexistente pendiente | `el precio y el contacto de cobro ya están llenos`; está marcada `it.fails` desde la base. No se modificó legal ni cobro |
| Fechas/presentación en México | `TZ=America/Mexico_City npx vitest run src/lib/design.test.ts`: 8/8 |
| `npm run build` | TypeScript y Vite correctos, con variables públicas de CI de ejemplo |
| Escaneo de secretos de CI | Sin coincidencias en el bundle para las expresiones de `.github/workflows/ci.yml` |
| Aislamiento de QA | No se incluyen `/qa` ni sus datos de prueba en el bundle de producción |
| Fuentes | Dos fuentes y dos licencias copiadas a `dist/fonts` |
| `git diff --check` | Correcto |
| Versiones existentes en el lockfile | No se actualizaron versiones de paquetes existentes; se añadió el entorno de pruebas DOM |
| Base remota | main seguía en `19242460a29f40fae3fa4ad2727325383ae05613` al comprobarla durante la entrega |
| Navegador visual | No verificado: acceso a la vista local bloqueado por el entorno de revisión |
| Supabase/IA autenticados | No ejecutados contra una cuenta real; los flujos de prueba utilizan dobles de API |
| Voz nativa física | Pendiente. Las pruebas cubren el contrato simulado del plugin |
| Producción | No desplegada; sin migraciones ni escrituras de datos. La entrega a GitHub se limita a una rama y un PR de revisión |

## Cobertura añadida

- Precisión monetaria, millones, negativos y centavos; mes local; transferencia/pago excluidos de consumo; contraste de tokens en ambos temas.
- Preguntas con ruta por prioridad; movimiento reducido; cuatro historias con lectura, avance y salto cuando faltan videos.
- Interpretación sin escritura; confirmación única ante doble toque; borrador conservado tras error; cancelación y resultados tardíos.
- Micro web: inicio explícito, doble toque, entrega de final una sola vez y cierre.
- Micro nativo simulado: cancelar durante permiso; cancelar `start()` pendiente; reabrir sesión; ignorar parciales y finales antiguos.
- Revisión manual separada, saldo tras confirmar, cuenta conservada ante error, cinco tipos de crédito y validación de fechas de corte.
- Ocultación accesible de cifras; Escape en diálogo superior y liberación del scroll.
- Recorrido con `App` real: cuatro tabs, Análisis → asistente con pregunta del mes, créditos, Planes, nueva cuenta desde el + y gasto manual que cambia el saldo una vez.

Las advertencias del build sobre importación mixta de Supabase y las advertencias del runner sobre esbuild/oxc no impidieron las comprobaciones. Se conserva el stack del repositorio.

El informe describe ejecución automatizada y revisión de código. No equivale a aprobación visual, prueba bancaria, revisión de tiendas ni certificación de accesibilidad completa.
