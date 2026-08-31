# Millions

App de finanzas personales con IA y voz. PWA en español, pensada para México:
modela días de corte y pago de tarjetas, registra por voz, y el asesor puede
ejecutar acciones que tú confirmas.

**Producción:** https://millionsjeshua.netlify.app

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
AI_MONTHLY_BUDGET_USD=40
```

`ANTHROPIC_API_KEY` está marcada como secreta en Netlify, así que **no se puede
leer de vuelta**: sácala de console.anthropic.com o de tu gestor de contraseñas.

### Comandos

| Comando | Qué hace |
|---|---|
| `npx netlify dev` | Levanta la app completa en local |
| `npm test` | 43 pruebas unitarias de la lógica pura |
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

---

## Base de datos

Las migraciones están en `supabase/migrations/`, numeradas y en orden. Ya
aplicadas al proyecto; se conservan como historia y para poder reconstruir.

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

Contra el proyecto real (crean y borran un usuario desechable):

```bash
export SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... SUPABASE_SECRET_KEY=...
node supabase/tests/e2e.mjs           # contrato del frontend y aislamiento RLS
node supabase/tests/flows.mjs         # transferencias, pagos, abonos, reversión
node supabase/tests/recurring.mjs     # motor de recurrentes
node supabase/tests/idempotency.mjs   # que un reintento no duplique
node supabase/tests/ai-actions.mjs    # ciclo de acciones del asesor
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

---

## Documentos

- **[TODO.md](TODO.md)** — plan de lanzamiento público, análisis de mercado y
  el historial de la auditoría. Es el documento vivo del proyecto.
- **[millions-context.md](millions-context.md)** — modelo de datos y decisiones
  de diseño.
- **[MIGRATION.md](MIGRATION.md)** — histórico: la migración del HTML
  monolítico a Vite, ya completada.
- [Análisis de mercado](https://claude.ai/code/artifact/c21562c0-df41-47a7-9af8-4b7924f3effc)
- [Roadmap original](https://claude.ai/code/artifact/3de9149e-a9af-4af3-a83a-cf7dc1f20794)
