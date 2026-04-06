import { and, count, desc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { DatabaseClient } from "../client";
import { media } from "../schema";

export interface MediaListFilters {
  mimeType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateMediaInput {
  altText?: string | null;
  filename?: string;
}

export async function createMedia(
  database: DatabaseClient,
  data: typeof media.$inferInsert,
) {
  const [mediaRow] = await database.insert(media).values(data).returning();

  return mediaRow;
}

export async function getMediaById(
  database: DatabaseClient,
  id: string,
) {
  const [mediaRow] = await database
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  return mediaRow ?? null;
}

export async function listMedia(
  database: DatabaseClient,
  filters: MediaListFilters = {},
) {
  const conditions: SQL[] = [];

  if (filters.mimeType) {
    conditions.push(eq(media.mimeType, filters.mimeType));
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    conditions.push(
      sql`${media.filename} ilike ${search} or ${media.altText} ilike ${search}`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const [rows, [{ value: total }]] = await Promise.all([
    database
      .select()
      .from(media)
      .where(where)
      .orderBy(desc(media.createdAt))
      .limit(limit)
      .offset(offset),
    database
      .select({ value: count() })
      .from(media)
      .where(where),
  ]);

  return { rows, total: Number(total), limit, offset };
}

export async function updateMedia(
  database: DatabaseClient,
  id: string,
  data: UpdateMediaInput,
) {
  const [mediaRow] = await database
    .update(media)
    .set({
      ...(data.altText !== undefined ? { altText: data.altText } : {}),
      ...(data.filename !== undefined ? { filename: data.filename } : {}),
    })
    .where(eq(media.id, id))
    .returning();

  return mediaRow ?? null;
}

export async function deleteMedia(
  database: DatabaseClient,
  id: string,
) {
  const [mediaRow] = await database
    .delete(media)
    .where(eq(media.id, id))
    .returning();

  return mediaRow ?? null;
}
