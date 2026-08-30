# MILLIONS — Contexto completo de la app

## ¿Qué es?
Millions es una app web progresiva (PWA) de finanzas personales con IA y voz, desarrollada para Jeshua (Aromante, Culiacán). Está desplegada en Netlify con backend serverless y base de datos en Supabase. Es multi-usuario: cada persona tiene su propia cuenta y datos completamente aislados.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 (CDN + Babel standalone), Chart.js 4 |
| Auth | Supabase Auth (email + contraseña) |
| Base de datos | Supabase (PostgreSQL) — proyecto: jyttvttnzndvqqrghqna |
| Backend | Netlify Function (Node.js) — archivo: `netlify/functions/chat.js` |
| IA | Anthropic API — modelo: claude-sonnet-4-20250514 |
| Voz | Web Speech API (SpeechRecognition) — idioma: es-MX |
| Deploy | Netlify (drag & drop manual, sin Git) |
| Dominio | charming-toffee-3b3ab5.netlify.app |

---

## Variables de entorno en Netlify (requeridas)
- `ANTHROPIC_API_KEY` — clave de Anthropic para la IA
- `SUPABASE_ANON_KEY` — clave pública de Supabase (también embebida en el HTML)
- `SECRETS_SCAN_OMIT_KEYS=SUPABASE_ANON_KEY` — para que Netlify no bloquee el anon key

---

## Arquitectura de seguridad
- La API key de Anthropic **nunca llega al cliente** — vive solo en la Netlify Function
- El anon key de Supabase **sí está en el HTML** (es una clave pública, diseñada para esto)
- Cada request autenticado envía el JWT del usuario a la función
- La función verifica el JWT contra `/auth/v1/user` de Supabase antes de ejecutar cualquier query
- Todas las queries filtran por `user_id` verificado — ningún usuario puede ver datos de otro
- RLS (Row Level Security) está desactivado en Supabase; el aislamiento lo hace la función manualmente

---

## Base de datos — Tablas en Supabase

### `jeshua_accounts`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | Generado automáticamente |
| user_id | UUID | FK al usuario autenticado |
| name | TEXT | Nombre de la cuenta |
| balance | NUMERIC(12,2) | Saldo actual |
| icon | TEXT | Emoji del ícono |
| color | TEXT | Color hex |
| created_at | TIMESTAMPTZ | Fecha de creación |

### `jeshua_transactions`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | — |
| user_id | UUID | FK al usuario |
| description | TEXT | Descripción del movimiento |
| amount | NUMERIC(12,2) | Monto positivo siempre |
| type | TEXT | "gasto" o "ingreso" |
| category | TEXT | Categoría (ver lista abajo) |
| account_id | UUID | FK a la cuenta afectada |
| account_name | TEXT | Nombre de la cuenta (desnormalizado) |
| date | TIMESTAMPTZ | Fecha del movimiento |

### `jeshua_credits`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | — |
| user_id | UUID | — |
| name | TEXT | Nombre del crédito |
| type | TEXT | "tarjeta", "hipoteca", "auto", "personal", "otro" |
| institution | TEXT | Banco o institución |
| total_debt | NUMERIC(12,2) | Deuda actual |
| credit_limit | NUMERIC(12,2) | Límite (tarjetas) |
| monthly_payment | NUMERIC(12,2) | Mensualidad (hipoteca/auto) |
| cut_day | INTEGER | Día de corte del mes (tarjetas) |
| payment_day | INTEGER | Día de pago del mes (tarjetas) |
| next_payment_date | DATE | Próxima fecha de pago (hipoteca/auto) |
| interest_rate | NUMERIC(5,2) | Tasa anual % |
| icon | TEXT | Emoji |
| color | TEXT | Color hex |
| notes | TEXT | Notas libres |
| created_at | TIMESTAMPTZ | — |

### `jeshua_budgets`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | — |
| user_id | UUID | — |
| category | TEXT | Categoría del presupuesto |
| amount | NUMERIC(12,2) | Límite mensual |
| created_at | TIMESTAMPTZ | — |

Nota: un usuario tiene máximo un presupuesto por categoría (upsert).

### `jeshua_goals`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | — |
| user_id | UUID | — |
| name | TEXT | Nombre de la meta |
| target_amount | NUMERIC(12,2) | Meta a alcanzar |
| current_amount | NUMERIC(12,2) | Lo ahorrado hasta ahora |
| target_date | DATE | Fecha objetivo (opcional) |
| icon | TEXT | Emoji |
| color | TEXT | Color hex |
| notes | TEXT | Notas |
| created_at | TIMESTAMPTZ | — |

---

## Netlify Function — Acciones disponibles (`action`)

| Acción | Auth requerida | Descripción |
|--------|---------------|-------------|
| `chat` | No | Proxy a Anthropic API — usado para IA de transacciones y análisis |
| `getAccounts` | Sí | Traer cuentas del usuario |
| `addAccount` | Sí | Crear nueva cuenta |
| `updateAccount` | Sí | Editar nombre, balance, ícono, color |
| `updateBalance` | Sí | Actualizar saldo — acepta `delta` (+/-) o `balance` absoluto |
| `getTxs` | Sí | Traer transacciones ordenadas por fecha desc |
| `addTx` | Sí | Crear transacción |
| `deleteTx` | Sí | Eliminar transacción |
| `getCredits` | Sí | Traer créditos |
| `addCredit` | Sí | Crear crédito |
| `updateCredit` | Sí | Editar crédito |
| `deleteCredit` | Sí | Eliminar crédito |
| `getBudgets` | Sí | Traer presupuestos |
| `upsertBudget` | Sí | Crear o actualizar presupuesto por categoría |
| `deleteBudget` | Sí | Eliminar presupuesto |
| `getGoals` | Sí | Traer metas de ahorro |
| `addGoal` | Sí | Crear meta |
| `updateGoal` | Sí | Editar meta (incluye abonar: solo actualiza current_amount) |
| `deleteGoal` | Sí | Eliminar meta |

**Formato del request:**
```json
{ "action": "string", "payload": {}, "token": "supabase_jwt" }
```

---

## Categorías de transacciones
Alimentación 🍔, Transporte 🚗, Salud 💊, Educación 📚, Entretenimiento 🎬, Servicios 💡, Compras 🛍️, Nómina 💼, Ventas 🌸, Transferencia ↔️, Otros 📦

---

## Funcionalidades — Lo que SÍ hace

### Autenticación
- Login y signup con email + contraseña via Supabase Auth
- Sesión persistente (no se cierra al recargar)
- Botón de cerrar sesión en el header
- Multi-usuario: cada cuenta ve solo sus datos

### Registro de transacciones
- **Por voz**: micrófono usando Web Speech API (es-MX), solo funciona en Safari (iOS) y Chrome (Android/desktop). Al terminar de hablar se envía automáticamente.
- **Por texto**: escribir en el chat del FAB sheet
- **Manual**: formulario completo con categoría, tipo, cuenta y monto
- La IA interpreta el lenguaje natural y extrae: tipo, monto, descripción, cuenta, categoría
- El saldo de la cuenta se actualiza automáticamente (optimistic update + persistencia)
- Al eliminar una transacción, el saldo se revierte

### Cuentas
- CRUD completo: crear, editar (nombre, saldo, ícono), listar
- Cada cuenta tiene: nombre, saldo, ícono (emoji), color
- El saldo se actualiza con delta (no valor absoluto) para evitar race conditions

### Créditos
- Tipos: tarjeta de crédito, hipoteca, crédito automotriz, personal, otro
- Tarjetas: límite, deuda, % de utilización con barra de color, día de corte y día de pago con cuenta regresiva
- Hipoteca/Auto: mensualidad, tasa de interés, fecha de próximo pago con cuenta regresiva
- Alerta roja en la app si hay pagos en los próximos 5 días

### Presupuestos
- Un presupuesto mensual por categoría
- Barra de progreso con color: verde (<80%), amarillo (80-99%), rojo (≥100%)
- Alerta amarilla en la app si algún presupuesto está al 90%+
- El progreso se calcula con los gastos del mes actual

### Metas de ahorro
- Nombre, meta en $, lo ahorrado, fecha objetivo, ícono, color, notas
- Barra de progreso
- Botón "Abonar" para sumar sin crear una transacción
- Cuenta regresiva de días si tiene fecha objetivo

### Asesor IA (pestaña Análisis)
- Chat con contexto completo: cuentas, gastos, ingresos, créditos, presupuestos del mes, metas
- Preguntas rápidas preconfiguradas
- Historial de conversación (multi-turn)
- Analiza patrones, tendencias, recomendaciones

### Dashboard
- Saldo total con gradiente
- Comparativa mes a mes (gastos actuales vs mes anterior con %)
- Gráfica de últimos 6 meses (barras ingresos/gastos + línea de balance)
- Dona de gastos por categoría con porcentajes
- Resumen de cuentas con acceso rápido a editar
- Últimas 5 transacciones
- Deuda total si tiene créditos
- Alertas de pagos urgentes y presupuestos al límite

### Historial
- Todas las transacciones ordenadas por fecha
- Icono de categoría en cada row
- Eliminar transacción con reversión automática de saldo
- **Exportar a CSV** — descarga archivo compatible con Excel con BOM UTF-8

### Micrófono
- Se apaga automáticamente al minimizar la app (visibilitychange)
- Se apaga al cerrar el FAB sheet
- Se apaga al navegar entre pestañas
- Usa `abort()` en lugar de `stop()` para corte inmediato

---

## Funcionalidades — Lo que NO hace (aún)

- **Notificaciones push en segundo plano** — está pendiente para futuro
- **Cuentas compartidas** entre usuarios — pendiente
- **Exportar a PDF** — solo CSV por ahora
- **Transferencias entre cuentas** — no existe flujo dedicado (se puede hacer manual)
- **Múltiples monedas** — solo MXN
- **Fotos de recibos** — no soporta adjuntos
- **Gráficas de metas o créditos** — solo texto y barras simples
- **Importar transacciones** desde banco o CSV
- **Editar transacciones** — solo se pueden eliminar, no modificar
- **Presupuestos anuales o semanales** — solo mensual
- **Agregar dinero a meta desde una cuenta** — el abono a metas no descuenta de ninguna cuenta
- **Historial de abonos a metas** — no lleva registro de cuándo se abonó
- **Búsqueda/filtros en historial** — no hay filtro por categoría, cuenta o fecha
- **Modo oscuro/claro** — solo modo oscuro
- **Soporte offline** — service worker básico pero no hay sincronización offline robusta

---

## Estructura de archivos

```
jeshua-pwa/
├── index.html              ← Toda la app (React + lógica + UI)
├── manifest.json           ← PWA manifest (nombre: Millions)
├── sw.js                   ← Service worker básico
├── icon.png                ← Ícono PWA (512x512, círculo morado)
├── netlify.toml            ← Config Netlify (directorio de functions)
└── netlify/
    └── functions/
        └── chat.js         ← Backend: proxy Anthropic + CRUD Supabase
```

---

## Navegación (pestañas)

1. **📊 Inicio** — Dashboard principal
2. **🎯 Metas** — Presupuestos + Metas de ahorro
3. **💳 Créditos** — Tarjetas, hipoteca, auto
4. **🤖 Análisis** — Asesor IA
5. **📋 Historial** — Todas las transacciones + exportar
6. **🏦 Cuentas** — Gestión de cuentas

**FAB ＋** (botón flotante): abre sheet con voz, texto o entrada manual

---

## Usuarios registrados
- **jeshualapizco@gmail.com** — usuario principal (Jeshua), tiene datos existentes asignados

---

## Notas importantes para desarrollo futuro
- El frontend es un único archivo HTML monolítico (sin build step, sin npm)
- React y Babel corren en el cliente vía CDN — no hay compilación
- Para agregar funcionalidades: modificar `index.html` y `netlify/functions/chat.js`
- El `updateBalance` usa delta para evitar race conditions
- La autenticación se verifica en cada request del servidor, no solo en el cliente
- Los datos de presupuestos se calculan client-side filtrando txs del mes actual
- Chart.js se usa para las gráficas (no Recharts ni D3)
