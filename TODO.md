# TODO — Bugs y observaciones detectados durante la migración

Anotados según la regla de MIGRATION.md: paridad exacta, los bugs no se tocan, solo se documentan.

## Bugs del monolito que siguen presentes (no tocados)

- **`exportCSV` no escapa comillas dobles** en la descripción. Una transacción con `"` en su descripción rompe la fila del CSV. (`src/lib/csv.ts`)
- **`sw.js` filtra URLs con `/api/`** pero los requests van a `/.netlify/functions/`, así que ese bypass de caché nunca aplica. (`public/sw.js`)
- **"¡Hoy!" en corte/pago de tarjeta es inalcanzable**: `daysUntil` compara contra `new Date(año, mes, día)` (medianoche), que casi siempre ya pasó, y salta al mes siguiente. El día del corte/pago muestra la fecha del mes próximo en vez de "¡Hoy!". (`src/lib/format.ts`)
- **`CreditCard` oculta la tasa si es 0**: la condición `credit.interest_rate && …` es falsy con `0`. (`src/components/CreditCard.tsx`)
- **Abonar a una meta no descuenta de ninguna cuenta** (documentado como pendiente en el contexto).

## Cambio de comportamiento derivado de la normalización pedida en MIGRATION.md

- En el monolito, las transacciones recargadas de Supabase solo traían `account_name` (snake_case) y el frontend leía `tx.accountName`, por lo que **tras recargar, la cuenta salía vacía en TxRow y en el CSV**. Al normalizar `account_id`/`account_name` → `accountId`/`accountName` una sola vez en `src/lib/api.ts` (como indica MIGRATION.md), el nombre de la cuenta ahora sí se muestra siempre.

## Código muerto no migrado

- `monthKey` estaba definido en el monolito pero nunca se usaba; no se migró (la estructura de destino tampoco lo lista).
