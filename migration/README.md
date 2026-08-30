# Migración a la base nueva (Fase 1)

## Estado

- [x] Snapshot de la base vieja: `snapshot-2026-08-30.json` (checksums incluidos)
- [x] Esquema v2: `../supabase/migrations/0001_schema.sql`
- [x] RLS: `../supabase/migrations/0002_rls.sql`
- [x] RPCs atómicas: `../supabase/migrations/0003_rpc.sql`
- [x] Script de importación: `import.mjs`
- [ ] Proyecto nuevo de Supabase creado (cuenta nueva)
- [ ] Migraciones aplicadas
- [ ] Datos importados y checksums verificados
- [ ] Frontend/function apuntando a la base nueva (Fase 2)
- [ ] Corte en producción
- [ ] Base vieja en solo-lectura 30 días → borrar tablas `jeshua_*`

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
