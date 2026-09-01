# Millions — instrucciones para cada sesión

Responde en español. El fundador es Jeshua; trabaja solo y alterna entre una
PC y una Mac, así que **todo lo que no está pusheado no existe**.

## Al empezar

1. Lee **[PENDIENTES.md](PENDIENTES.md)**. Es la lista viva de bugs, mejoras y
   el plan de migración a tiendas. Se trabaja de arriba hacia abajo salvo que
   Jeshua diga otra cosa.
2. `git status` y `git log --oneline -5` para saber dónde quedó la otra máquina.
3. Para contexto de fondo: [README.md](README.md) (arrancar, trampas
   conocidas), [millions-context.md](millions-context.md) (modelo de datos y
   decisiones) y [TODO.md](TODO.md) (plan de lanzamiento, mercado, historia).

## La regla del documento vivo

**Cada commit que cierra un punto de `PENDIENTES.md` borra ese punto en el
mismo commit.** No se tacha, no se mueve a "hecho": se elimina. Lo que ya se
hizo queda en `git log` y, si cambió una decisión, en `TODO.md` o
`millions-context.md`. Si un commit cierra algo a medias, el punto se reescribe
con lo que falta. Si al trabajar aparece un bug nuevo, se agrega en la sección
que le toca con archivo:línea.

Al final de cada sesión, si `PENDIENTES.md` cambió, va en el commit.

## Reglas del código (las que ya costaron tiempo)

- Levantar con `npx netlify dev`, nunca `npm run dev` (la IA no responde y no
  hay error visible).
- Antes de commitear: `npm test` y `npm run build`. La CI falla si aparece una
  llave secreta en el bundle.
- Fechas: un `DATE` de Postgres se parsea con `parseDateOnly`; nunca
  `new Date("2026-09-05")` ni `toISOString().slice(0,10)` para obtener un día
  local. Todo vive en `src/lib/dates.ts`.
- Dinero: solo por RPC atómica. Nunca insertar y luego actualizar el saldo.
- La lógica pura de `src/lib/` no importa `api.ts` (construye el cliente de
  Supabase al cargarse y revienta las pruebas en CI).
- Al tocar el texto legal, subir `LEGAL_VERSION` en `src/lib/legal.ts`.
- Migraciones: archivo numerado en `supabase/migrations/` **y** aplicada con
  `apply_migration` para que quede registrada. La 0014 se aplicó suelta y por
  eso el ledger no cuadra; no repetirlo.
- Estilos en línea con los tokens de `src/lib/constants.ts` (`C`, `S`). No
  agregar librerías de UI ni de estado sin decisión explícita.

## Estilo de commits

Español, minúsculas, sin punto final, dicen el *porqué* cuando no es obvio:
`fix: el tope de gasto ignoraba el error de su propia consulta`. Se commitea y
pushea solo cuando Jeshua lo pide.
