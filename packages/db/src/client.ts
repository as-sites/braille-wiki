import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

import * as schema from "./schema";

// Support running from both workspace root and package/app directories.
loadEnv();
loadEnv({ path: resolve(process.cwd(), "../../.env"), override: false });

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment before using @braille-wiki/db.",
    );
  }

  return databaseUrl;
}

export const connection = neon(getDatabaseUrl());

export const db = drizzle(connection, { schema });

export type DatabaseClient = typeof db;
