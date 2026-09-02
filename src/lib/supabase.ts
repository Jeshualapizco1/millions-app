import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * PKCE: el enlace del correo trae un `code` que se cambia por sesión, en vez
 * de traer los tokens en el fragmento de la URL. Es lo único que funciona
 * cuando el enlace abre la app nativa por deep link, y en la web es igual de
 * válido. `detectSessionInUrl` se encarga solo en el navegador; en nativo lo
 * hace `src/lib/native.ts` con la URL que entrega el sistema.
 */
export const sbClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: "pkce", detectSessionInUrl: true } }
);
