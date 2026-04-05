/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly INTERNAL_SECRET?: string;
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
