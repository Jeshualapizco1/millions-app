import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const sbClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
