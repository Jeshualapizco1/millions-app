// ============================================================================
// Lo que el cliente puede mandarle a la función de IA. Vive aparte de chat.ts
// (y fuera de netlify/functions, donde cada archivo se vuelve un endpoint)
// para poder probarlo sin arrastrar Supabase.
//
// Antes cualquier bloque `{ type: ..., ... }` pasaba tal cual a Anthropic.
// Un bloque `image` o `document` con `source: { type: "url" }` hace que
// Anthropic DESCARGUE el recurso: el límite de 64 KB del body no lo cubría
// y un cliente hostil podía meter un PDF de 30 MB en cada consulta, a
// nuestro costo. Ahora solo pasan los bloques que el flujo de verdad usa.
// ============================================================================
import { z } from "zod";

/** Texto de la persona, o de un turno del asistente devuelto tal cual. */
const TextBlock = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(16_000),
});

/** Acción propuesta por el asesor, devuelta para continuar la conversación. */
const ToolUseBlock = z.object({
  type: z.literal("tool_use"),
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(64),
  input: z.record(z.string(), z.unknown()),
});

/**
 * Razonamiento del asistente. Se devuelve íntegro con su firma porque
 * Anthropic lo exige para continuar el turno; el contenido no se interpreta.
 */
const ThinkingBlock = z.object({
  type: z.literal("thinking"),
  thinking: z.string().max(64_000),
  signature: z.string().max(8_000),
});

const RedactedThinkingBlock = z.object({
  type: z.literal("redacted_thinking"),
  data: z.string().max(64_000),
});

/** Resultado de ejecutar (o rechazar) la acción, en texto plano. */
const ToolResultBlock = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
  is_error: z.boolean().optional(),
});

/**
 * Discriminado por `type`: `image`, `document` o cualquier otro se rechazan
 * de plano. Las llaves que no están en el esquema se DESCARTAN (zod las
 * quita por omisión), así que un `source` colado en un bloque de texto
 * tampoco llega.
 */
export const BlockSchema = z.discriminatedUnion("type", [
  TextBlock,
  ToolUseBlock,
  ThinkingBlock,
  RedactedThinkingBlock,
  ToolResultBlock,
]);

export const ContentSchema = z.union([
  z.string().min(1).max(4000),
  z.array(BlockSchema).min(1).max(20),
]);

export const BodySchema = z.object({
  intent: z.enum(["capture", "advise"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: ContentSchema }))
    .min(1)
    .max(24),
});

export type ChatBody = z.infer<typeof BodySchema>;
