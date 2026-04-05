/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly INTERNAL_SECRET?: string;
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    dbDocument?: NonNullable<import("./lib/db").PublishedDocumentRecord>;
    requestedPath?: string;
  }
}
