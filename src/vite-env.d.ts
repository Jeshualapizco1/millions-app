/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Llave pública de Cloudflare Turnstile. Sin ella el captcha no se muestra. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Base absoluta de las funciones (nativo). Vacía en la web: mismo origen. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Commit desplegado, inyectado por Vite. */
declare const __COMMIT__: string;
