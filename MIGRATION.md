# Migración de Millions a Vite + React + TypeScript

Este documento es la instrucción de trabajo para Claude Code. El objetivo es convertir la app actual (un único `index.html` con React por CDN y Babel en el navegador) en un proyecto real con build, tipos y componentes separados — **sin cambiar ninguna funcionalidad ni el diseño visual**.

Lee `CONTEXT.md` antes de empezar: ahí está descrito todo lo que la app hace hoy.

---

## Regla principal

**Paridad exacta.** Al terminar, la app debe verse y comportarse idéntica a la actual. No es un rediseño ni una oportunidad para "mejorar" cosas de paso. Si encuentras algo que te parece un bug, anótalo en `TODO.md` y no lo toques.

---

## Estado actual

- Un solo archivo `index.html` (~80 KB) con todo: React, estilos inline, lógica, vistas y modales.
- React 18, Chart.js 4 y `@supabase/supabase-js` cargados por CDN.
- Babel standalone compila el JSX en el navegador en cada carga.
- Backend: `netlify/functions/chat.js` (Node, sin dependencias externas, usa `https` nativo).
- Deploy: arrastrar carpeta a Netlify.

## Estado objetivo

- Vite + React 18 + TypeScript.
- Código dividido en módulos por responsabilidad.
- Build real (`npm run build` → `dist/`), deploy automático desde GitHub.
- La Netlify Function se queda como está, en el mismo path.

---

## Estructura de destino

```
millions-app/
├── index.html                  # solo el shell: <div id="root"> + meta PWA
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── netlify.toml
├── public/
│   ├── manifest.json
│   ├── icon.png
│   └── sw.js
├── netlify/
│   └── functions/
│       └── chat.ts             # migrar de .js a .ts (misma lógica)
└── src/
    ├── main.tsx                # createRoot + render <Root/>
    ├── Root.tsx                # manejo de sesión: checking / AuthScreen / App
    ├── App.tsx                 # layout, tabs, estado global, orquestación
    ├── types.ts                # Account, Transaction, Credit, Budget, Goal, ApiAction
    ├── lib/
    │   ├── supabase.ts         # cliente, leído de import.meta.env
    │   ├── api.ts              # wrapper tipado sobre /.netlify/functions/chat
    │   ├── constants.ts        # C (colores), CATS, CREDIT_TYPES, ACC_ICONS, GOAL_ICONS…
    │   ├── format.ts           # fmt, fmtShort, daysUntil, monthLabel
    │   └── csv.ts              # exportCSV
    ├── hooks/
    │   ├── useFinanceData.ts   # carga inicial + estado de accounts/txs/credits/budgets/goals
    │   ├── useVoice.ts         # SpeechRecognition + limpieza (visibilitychange, abort)
    │   └── useAI.ts            # sendTx y sendAnalysis con su historial
    ├── components/
    │   ├── Modal.tsx
    │   ├── TxRow.tsx
    │   ├── CreditCard.tsx
    │   ├── CreditForm.tsx
    │   ├── Fab.tsx             # botón flotante + sheet de captura
    │   ├── ProgressBar.tsx
    │   └── charts/
    │       ├── DonutChart.tsx
    │       └── MonthlyChart.tsx
    ├── views/
    │   ├── AuthScreen.tsx
    │   ├── Dashboard.tsx
    │   ├── Metas.tsx           # presupuestos + metas de ahorro
    │   ├── Creditos.tsx
    │   ├── Analisis.tsx
    │   ├── Historial.tsx
    │   └── Cuentas.tsx
    └── modals/
        ├── AccountModal.tsx    # nueva / editar cuenta
        ├── BudgetModal.tsx
        ├── GoalModal.tsx       # nueva / editar / abonar
        └── ManualTxModal.tsx
```

---

## Dependencias

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.45.0",
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

Nada de librerías de UI ni de estado. Los estilos siguen siendo inline como hoy.

---

## Variables de entorno

El anon key de Supabase hoy está escrito directo en el HTML. Muévelo a variables de Vite:

```
# .env  (NO se commitea)
VITE_SUPABASE_URL=https://jyttvttnzndvqqrghqna.supabase.co
VITE_SUPABASE_ANON_KEY=<el anon key actual>
```

Crea también un `.env.example` con las mismas claves y valores vacíos, ese sí se commitea.

En Netlify hay que agregar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` a las variables del sitio, porque ahora se leen en tiempo de build. Las que ya existen (`ANTHROPIC_API_KEY`, `SUPABASE_ANON_KEY`, `SECRETS_SCAN_OMIT_KEYS`) se quedan: las usa la function.

Nota: el anon key es una clave pública y termina en el bundle igual que antes. Sacarlo del código fuente es por orden y para poder rotarlo, no porque pase a ser secreto.

---

## netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

---

## .gitignore

```
node_modules
dist
.env
.env.local
.netlify
.DS_Store
```

---

## Tipos base (`src/types.ts`)

Deriva los tipos de las columnas reales de Supabase descritas en `CONTEXT.md`. Ojo con dos detalles que hoy causan bugs silenciosos:

- Supabase devuelve los `NUMERIC` como **string** (`"473296.00"`), no como número. Hoy el código lo compensa con `Number(...)` en cada lectura. Tipa esos campos como `number` y haz la conversión **una sola vez**, en la capa de `api.ts`, al recibir la respuesta.
- Las filas traen `account_id` (snake_case) y el frontend usa `accountId`. Normaliza también en `api.ts` para que el resto de la app trabaje con una sola forma.

`ApiAction` debe ser una unión de strings con las 19 acciones que expone la function, para que una acción mal escrita sea error de compilación.

---

## Orden de trabajo

Haz un commit por paso. Después de cada paso, `npm run build` debe pasar sin errores.

1. **Andamiaje.** `npm create vite@latest` (react-ts), instalar dependencias, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.env`, `netlify.toml`. Mover `manifest.json`, `icon.png` y `sw.js` a `public/`. Dejar `index.html` como shell con los mismos `<meta>` de PWA que hoy (theme-color, apple-mobile-web-app-*, manifest). Quitar los `<script>` de CDN y Babel.
2. **Fundamentos.** `types.ts`, `lib/constants.ts`, `lib/format.ts`, `lib/csv.ts`, `lib/supabase.ts`, `lib/api.ts`. Copia los valores tal cual del HTML: colores, categorías con sus emojis y colores, tipos de crédito, listas de íconos.
3. **Componentes puros.** `Modal`, `TxRow`, `CreditCard`, `CreditForm`, `ProgressBar`, los dos charts. Mismo markup y mismos estilos inline. En los charts, conserva el patrón actual de `useRef` + `destroy()` en el cleanup del `useEffect`.
4. **Hooks.** `useFinanceData`, `useVoice`, `useAI`. Mueve aquí la lógica que hoy vive suelta en `App`. `useVoice` debe conservar los tres apagados del micrófono: `visibilitychange`, cierre del FAB y `abort()` en lugar de `stop()`.
5. **Vistas y modales.** Una por archivo, recibiendo props explícitas. Sin lógica de red dentro de las vistas.
6. **`App.tsx` y `Root.tsx`.** Estado global, tabs, banners de alerta, y el cableado de todo lo anterior.
7. **Function a TypeScript.** `chat.js` → `chat.ts` con el `Handler` de `@netlify/functions`. La lógica no cambia: mismas 19 acciones, misma verificación de JWT, mismo filtrado por `user_id`, mismo manejo de `delta` en `updateBalance`.
8. **Limpieza.** Borrar el `index.html` viejo y cualquier resto del ZIP.

---

## Verificación antes de dar por terminada la migración

Con `npm run dev`, revisar una por una:

- Login, signup, cerrar sesión y sesión persistente al recargar.
- Dashboard: saldo total, comparativa mes a mes, gráfica de 6 meses, dona por categoría, cuentas, recientes.
- Alta de transacción por voz, por texto y manual; el saldo de la cuenta se ajusta.
- Borrar transacción y confirmar que el saldo se revierte.
- Cuentas: crear y editar (nombre, saldo, ícono).
- Créditos: los cinco tipos, barra de utilización, cuentas regresivas, banner rojo de pago próximo.
- Presupuestos: crear, barra con sus tres colores, banner amarillo al 90%.
- Metas: crear, editar, abonar, barra de progreso, días restantes.
- Análisis: preguntas rápidas y chat con contexto de varios turnos.
- Exportar CSV y abrirlo en Excel con acentos correctos.
- Instalación PWA en iPhone: ícono, nombre "Millions", modo standalone, safe areas.

Comparar contra la versión en producción mientras se prueba.

---

## Lo que NO hay que hacer en esta migración

- Cambiar diseño, colores, textos o iconografía.
- Agregar funcionalidades de la lista de pendientes de `CONTEXT.md`.
- Cambiar el esquema de Supabase o el contrato de la function.
- Meter Tailwind, CSS modules, librerías de estado o de routing.
- Reactivar RLS. Hoy el aislamiento por usuario lo hace la function; cambiarlo es un trabajo aparte.
