/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Llave pública de Cloudflare Turnstile. Sin ella el captcha no se muestra. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Commit desplegado, inyectado por Vite. */
declare const __COMMIT__: string;
