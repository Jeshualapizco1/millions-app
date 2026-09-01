# Millions

App de finanzas personales con IA y voz. PWA en español, pensada para México:
modela días de corte y pago de tarjetas, registra por voz, y el asesor puede
ejecutar acciones que tú confirmas.

**Producción:** https://millionsjeshua.netlify.app

> **Estado (1 de septiembre de 2026):** el registro está **cerrado**. Para
> abrirlo faltan cinco datos y un panel — ver *Lo que falta para abrir el
> registro* más abajo. El plan completo está en **[TODO.md](TODO.md)**.

---

## Arrancar en una máquina nueva

```bash
git clone https://github.com/Jeshualapizco1/millions-app.git
cd millions-app
npm install
```

### ⚠️ Usa `netlify dev`, no `npm run dev`

```bash
npx netlify dev      # ✅ correcto
npm run dev          # ❌ la app se abre VACÍA, sin ningún error visible
```

`npm run dev` solo levanta Vite. La función de IA vive en `/.netlify/functions/`
y no existe en ese servidor, así que las llamadas fallan en silencio y la app
parece rota sin decir por qué. `netlify dev` levanta las dos cosas en un puerto.

### El archivo `.env`

No está en el repo (ni debe estarlo). Créalo con esta forma — los valores
están en **Netlify → Site settings → Environment variables**:

```bash
# Cliente (Vite). Son públicas: terminan en el bundle por diseño.
VITE_SUPABASE_URL=https://wliksgpzgfidvakjubdu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_TURNSTILE_SITE_KEY=              # opcional; sin ella no se pinta el captcha

# Solo servidor. NUNCA al cliente.
SUPABASE_URL=https://wliksgpzgfidvakjubdu.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
ANTHROPIC_API_KEY=sk-ant-...

# Topes de gasto de IA (opcionales; estos son los valores por defecto)
AI_CALLS_PER_USER_DAY=15
AI_CALLS_PER_USER_MONTH=400
AI_MONTHLY_BUDGET_USD=40   # ⚠️ el default del código es 50; confirma el valor en Netlify
```

`ANTHROPIC_API_KEY` está marcada como secreta en Netlify, así que **no se puede
leer de vuelta**: sácala de console.anthropic.com o de tu gestor de contraseñas.

### Comandos

| Comando | Qué hace |
|---|---|
| `npx netlify dev` | Levanta la app completa en local |
| `npm test` | 110 pruebas de la lógica pura (1 falla a propósito, ver abajo) |
| `npm run build` | Typecheck + build de producción |

---

## Cómo está construida

```
Cliente (React + TS)  ──────────►  Supabase (Postgres + RLS)
       │                              cuentas, movimientos, créditos…
       │
       └── /.netlify/functions/chat ──►  API de Anthropic
                   (solo IA)
```

**El cliente habla directo con Supabase.** La autorización la hace Postgres con
RLS: cada fila lleva `user_id` y las políticas exigen `user_id = auth.uid()`.
No hay una capa intermedia que pueda equivocarse filtrando.

**Cada movimiento de dinero es una RPC atómica**, no varias llamadas sueltas:
`apply_transaction`, `transfer`, `pay_credit`, `contribute_goal`,
`reverse_transaction`, `update_transaction`, `import_transactions`. Insertan y
ajustan saldos en una sola transacción de Postgres, así que un fallo a media
operación no deja el saldo desfasado.

**La función de Netlify solo sirve a la IA.** Verifica el JWT, valida con zod,
construye el contexto financiero en el servidor (el cliente no puede
manipularlo) y aplica los topes de gasto. Nunca escribe en la base.

### Modelos de IA

| Tarea | Modelo | Por qué |
|---|---|---|
| Capturar un movimiento | `claude-haiku-4-5` | Es extracción: monto, cuenta y categoría de una frase |
| Asesor financiero | `claude-sonnet-5` | Razona sobre todo el panorama y propone acciones |

Costo medido: **$0.00077** por captura, **$0.00438** por consulta al asesor.

### Trabajos automáticos (`pg_cron`)

| Job | Hora (Mazatlán) | Qué hace |
|---|---|---|
| `millions-recurring` | 6:00 diario | Genera los movimientos fijos vencidos |
| `millions-net-worth` | 6:05, último día del mes | Guarda el corte de patrimonio |
| `millions-fx-request` | 6:10 diario | Pide tipos de cambio al BCE |
| `millions-fx-collect` | 6:15 diario | Guarda la respuesta (pg_net es asíncrono) |
| `millions-purge-errors` | domingos 6:30 | Borra errores de más de 60 días |
| `millions-purge-accounts` | 6:30 diario | Borra las cuentas cuyo plazo de gracia venció |

---

## Base de datos

Las migraciones están en `supabase/migrations/`, numeradas y en orden. Ya
aplicadas al proyecto; se conservan como historia y para poder reconstruir.

> ⚠️ **El ledger no cuadra con la base.** La `0014` está aplicada pero **no
> registrada** en `supabase_migrations` (se corrió con SQL suelto), y
> `0006_recurring_service_grant` existe en la base pero **no está en el repo**.
> Hoy no rompe nada; reconstruir desde cero sí saldría distinto a producción.

Tablas: `profiles` · `categories` · `accounts` · `credits` · `goals` ·
`recurring_rules` · `transactions` · `budgets` · `credit_payments` ·
`goal_contributions` · `net_worth_snapshots` · `fx_rates` · `ai_usage` ·
`client_errors`.

**Todas con RLS forzado**, salvo `fx_rates`, que es dato de referencia
compartido: se lee autenticado y solo el backend escribe.

---

## Pruebas

```bash
npm test                                  # unitarias, sin red
```

**Una prueba falla a propósito** (`it.fails`) y es un recordatorio, no un bug:
se pone verde sola en cuanto se llenen `PRECIO_TEXTO` y `CONTACTO_PAGO` en
`src/lib/legal.ts`. Si alguna vez ves todo verde, es que el muro de fin de
prueba ya tiene precio y contacto.

**El paso de pruebas de CI no define variables de entorno**, a propósito: la
lógica pura no debería necesitarlas. Antes de subir algo, vale la pena correr
`npm test` con el `.env` fuera — así se detecta si un módulo puro arrastró por
error a `api.ts`, que construye el cliente de Supabase al importarse.

Contra el proyecto real (crean y borran un usuario desechable):

```bash
export SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=...
node supabase/tests/e2e.mjs           # contrato del frontend y aislamiento RLS
node supabase/tests/flows.mjs         # transferencias, pagos, abonos, reversión
node supabase/tests/recurring.mjs     # motor de recurrentes
node supabase/tests/idempotency.mjs   # que un reintento no duplique
node supabase/tests/ai-actions.mjs    # ciclo de acciones del asesor
node supabase/tests/ai-reserve.mjs    # topes de IA bajo concurrencia (no llama a Anthropic)
```

---

## Despliegue

Automático: al hacer push a `main`, Netlify construye y publica.
GitHub Actions corre pruebas, typecheck y build en cada push, y **falla si
aparece una llave secreta en el bundle del cliente**.

Para revertir: Netlify → Deploys → el deploy anterior → *Publish deploy*.

---

## Trampas conocidas

Cosas que ya costaron tiempo y conviene no volver a descubrir:

- **`npm run dev` deja la app vacía sin error.** Usa `netlify dev`.
- **El CI usa `npm install`, no `npm ci`.** El lock se genera en Windows y
  esbuild trae binarios opcionales por plataforma que hacen fallar a `npm ci`
  en Linux con `EBADPLATFORM`.
- **Las funciones de Netlify cortan a los 10 segundos.** Por eso el asesor va
  con esfuerzo medio; con esfuerzo alto rozaba el límite y devolvía 504.
- **`ANTHROPIC_API_KEY` solo tiene valor en el contexto `production`.** Los
  deploy previews no pueden usar la IA.
- **Al probar los topes de gasto**, borrar el usuario de prueba borra en
  cascada su `ai_usage`, así que el acumulado vuelve a cero y el freno parece
  no funcionar. Hay que hacer dos llamadas con el mismo usuario sin borrarlo.
- **Las tasas de cambio son MXN → X.** Convertir a pesos **divide**, no
  multiplica. Toda la conversión vive en `src/lib/currency.ts` con pruebas.
- **"Leaked password protection" de Supabase requiere plan Pro.** El advisor
  de seguridad la marcará siempre; no es un pendiente.
- **La lógica pura no debe importar `lib/api.ts`.** Ese módulo construye el
  cliente de Supabase al cargarse, así que una prueba que lo arrastre revienta
  en CI con *"supabaseUrl is required"* aunque pase en local. Por eso
  `findByName` vive en `lib/names.ts` y no en `lib/actions.ts`.
- **Nunca uses `toISOString()` para una fecha local.** De tarde en México
  devuelve el día siguiente. Para un DATE de Postgres, `lib/dates.ts` arma la
  cadena con `getFullYear/getMonth/getDate`.
- **El selector de moneda está apagado** tras `SELECTOR_DE_MONEDA_ACTIVO` en
  `lib/currency.ts`. `Transaction` no guarda moneda y `sumSpend`/`sumIncome` no
  convierten, así que una cuenta en dólares corrompe en silencio gastos,
  presupuestos y la proyección. Una prueba se pone roja si se enciende.
- **Al tocar el texto legal hay que subir `LEGAL_VERSION`.** Si no, las
  constancias dirán que alguien aceptó algo que nunca vio — y al subirla, todo
  el mundo vuelve a pasar por el portón, que es lo que se busca.

---

## Lo que falta para abrir el registro

Cinco valores en el código y tres pasos en paneles externos. Nada de esto es
programación:

| Qué | Dónde |
|---|---|
| `RESPONSABLE`, `DOMICILIO`, `CORREO_ARCO` | `src/lib/legal.ts` — sin los tres el aviso de privacidad es inválido |
| `PRECIO_TEXTO`, `CONTACTO_PAGO` | `src/lib/legal.ts` — sin ellos el muro de fin de prueba es un callejón sin salida |
| Sitio de Cloudflare Turnstile | `VITE_TURNSTILE_SITE_KEY` en Netlify + la llave secreta en Supabase → Auth → Attack Protection |
| Activar el registro | Supabase → Authentication → Sign In / Providers → *Allow new users to sign up*. **Al final.** |
| Revisión legal | Que un abogado lea el aviso y los términos |

El `it.fails` de `npm test` es el recordatorio del precio y el contacto de cobro.

---

## Documentos

- **[PENDIENTES.md](PENDIENTES.md)** — lista viva de bugs, mejoras y plan de
  tiendas. Cada commit que cierra un punto lo borra. Empieza por aquí.
- **[CLAUDE.md](CLAUDE.md)** — instrucciones que carga cada sesión de Claude Code.
- **[TODO.md](TODO.md)** — plan de lanzamiento público, análisis de mercado y
  el historial de la auditoría. Es el documento vivo del proyecto.
- **[millions-context.md](millions-context.md)** — modelo de datos y decisiones
  de diseño.
- **[MIGRATION.md](MIGRATION.md)** — histórico: la migración del HTML
  monolítico a Vite, ya completada.
- [Análisis de mercado](https://claude.ai/code/artifact/c21562c0-df41-47a7-9af8-4b7924f3effc)
- [Roadmap original](https://claude.ai/code/artifact/3de9149e-a9af-4af3-a83a-cf7dc1f20794)
