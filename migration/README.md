# Migración a la base nueva (Fase 1)

## Estado

- [x] Snapshot de la base vieja: `snapshot-2026-08-30.json` (checksums incluidos)
- [x] Esquema v2: `../supabase/migrations/0001_schema.sql`
- [x] RLS: `../supabase/migrations/0002_rls.sql`
- [x] RPCs atómicas: `../supabase/migrations/0003_rpc.sql`
- [x] Script de importación: `import.mjs`
- [x] Proyecto nuevo de Supabase creado: `wliksgpzgfidvakjubdu` (cuenta personal, 2026-08-30)
- [x] Migraciones aplicadas (0001–0004, vía MCP; advisors de seguridad en cero)
- [x] Datos importados y checksums verificados centavo por centavo
- [x] Usuario invitado y aceptado (jeshualapizco@gmail.com); registro cerrado
- [x] Frontend/function apuntando a la base nueva (Fase 2): CRUD directo con RLS, function solo IA
- [x] E2E contra el proyecto real: `supabase/tests/e2e.mjs`
- [x] Corte en producción: https://millionsjeshua.netlify.app (2026-08-30, commit 5310ed4)
      Deploy automático desde `main`. Verificado: bundle apunta a la base nueva,
      cero secretos en el cliente, function 401 sin token, IA respondiendo.
- [x] Fase 3: pantalla de cambio de contraseña en la app (botón 🔑 del header)
- [ ] Authentication → URL Configuration → Site URL = https://millionsjeshua.netlify.app
      (hoy apunta al default localhost:3000; por eso el flujo de invitación no
      dejó bien definida la contraseña — se resolvió con reset por admin API.
      Necesario antes de invitar al resto del equipo.)
- [~] "Leaked password protection": NO aplicable. Requiere plan Pro y la
      organizacion "Jeshua MP" esta en Free. El advisor de Supabase seguira
      marcandolo; es esperado, no es un pendiente. Vive en
      Authentication → Sign In / Providers → Email (no en un menu "Passwords").
      Alternativa gratuita en esa misma pantalla: subir la longitud minima de
      contrasena a 10-12 y exigir variedad de caracteres.
- [ ] ANTHROPIC_API_KEY solo tiene valor en el contexto `production` de Netlify.
      Los deploy previews no pueden usar la IA hasta agregarla a esos contextos.
- [ ] Base vieja en solo-lectura 30 días (hasta ~2026-09-30) → borrar tablas
      `jeshua_*` del proyecto jyttvttnzndvqqrghqna

## Rollback

Si algo sale mal en producción: Netlify → Deploys → el deploy anterior →
"Publish deploy". La base vieja sigue intacta y con datos hasta el 30 de
septiembre, así que revertir el sitio la deja operando como antes.

> Nota: las llaves legacy (anon/service_role) están deprecated en el proyecto
> nuevo. Se usan `sb_publishable_...` (cliente) y `sb_secret_...` (servidor).

## Qué se necesita del proyecto nuevo

Del dashboard del proyecto nuevo (Settings → API y Settings → Database):

1. **Project URL** — `https://<ref>.supabase.co`
2. **anon key** — irá en `.env` como `VITE_SUPABASE_ANON_KEY`
3. **service_role key** — solo para `import.mjs` y la Netlify Function; nunca al cliente
4. **Connection string** (modo *session*, con contraseña) — para aplicar migraciones

## Pasos

```bash
# 1. Aplicar migraciones (en orden; --single-transaction revierte todo si algo falla)
psql "<connection-string>" --single-transaction -f supabase/migrations/0001_schema.sql
psql "<connection-string>" --single-transaction -f supabase/migrations/0002_rls.sql
psql "<connection-string>" --single-transaction -f supabase/migrations/0003_rpc.sql

# 2. Simulacro
NEW_SUPABASE_URL=... NEW_SERVICE_ROLE_KEY=... node migration/import.mjs --dry-run

# 3. Importación real (invita a jeshualapizco@gmail.com y carga sus datos)
NEW_SUPABASE_URL=... NEW_SERVICE_ROLE_KEY=... node migration/import.mjs
```

El script es idempotente (upsert por id): se puede correr varias veces.
Si algún checksum no cuadra, **no se hace el corte**.

## Configuración manual en el dashboard del proyecto nuevo

- **Authentication → Sign In / Up → deshabilitar "Allow new users to sign up"**
  (el acceso queda solo por invitación; decisión de Fase 0)
- Authentication → Email Templates: opcional, personalizar la invitación
- Invitar al resto del equipo cuando se quiera:
  jeshua@, josue@, arthur@, karyme@, eduardo@ @aromante.mx
  (sus cuentas viejas estaban vacías; no hay datos que migrar)

## Decisiones tomadas (Fase 0)

- Solo se migra `jeshualapizco@gmail.com` (única cuenta con datos).
- Las contraseñas no cruzan de proyecto: el dueño llega por invitación
  y define contraseña nueva.
- Las 3 transacciones con categoría "Transferencia" del snapshot eran pagos
  a terceros, no movimientos entre cuentas propias: se importan como `gasto`
  con esa categoría. El tipo `transferencia` nuevo queda reservado para
  movimientos entre cuentas propias.
- Las columnas `icon`/`color` de créditos no se migran (nunca se usaron).
- `account_name` desaparece: el nombre de cuenta se resuelve por join.
