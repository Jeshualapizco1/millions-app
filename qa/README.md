# Revisión local de la integración

Esta carpeta renderiza los componentes de la app real con datos ficticios y reemplaza todas las operaciones de `api` por funciones locales. Una operación no simulada devuelve error. No inicia sesión ni escribe en producción. No está incluida en `dist`.

Arranca la app como indica el repositorio: `npx netlify dev`, con variables públicas de un entorno de prueba. Para revisar exclusivamente `/qa/index.html` también bastan `VITE_SUPABASE_URL=https://example.supabase.co` y `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_preview`; esos valores no sirven para iniciar sesión real.

Abre `/qa/index.html` desde la URL que imprima Netlify. El marco permite 320, 390, 430 y 768 px, onboarding, estado vacío, millones y saldo negativo. La integración de componentes y los datos de análisis están probados automáticamente; la inspección visual de este marco queda pendiente.

El mock cubre carga, captura de texto, guardado manual y nueva cuenta. Los pagos y otras operaciones no simuladas muestran error por diseño. Su conexión real está en `src/lib/api.ts` y debe probarse con un usuario de prueba en `/`.

Guiones y conexión de videos: `src/lib/journey.ts`; contrato de integración y límites: `docs/diseno/integracion-14.md`.
