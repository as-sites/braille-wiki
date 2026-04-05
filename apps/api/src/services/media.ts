import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import sizeOf from "image-size";

import { db } from "@braille-docs/db";
import {
  createMedia,
  deleteMedia as dbDeleteMedia,
  getMediaById,
  listMedia as dbListMedia,
  updateMedia as dbUpdateMedia,
} from "@braille-docs/db";

import { NotFoundError } from "../lib/errors";
import { deleteObject, getPublicUrl, uploadObject } from "../lib/storage";

const database = db;

export interface UploadMediaInput {
  file: {
    buffer: Buffer;
    name: string;
    type: string;
    size: number;
  };
  altText?: string;
  userId: string;
}

export interface ListMediaParams {
  mimeType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function getImageDimensions(
  buffer: Buffer,
  mimeType: string,
): { width: number | null; height: number | null } {
  if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") {
    return { width: null, height: null };
  }

  try {
    const result = sizeOf(buffer);
    return {
      width: result.width ?? null,
      height: result.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}

export async function uploadMedia(input: UploadMediaInput) {
  const { file, altText, userId } = input;
  const ext = extname(file.name).toLowerCase();
  const uuid = randomUUID();
  const storageKey = `media/${uuid}${ext}`;

  await uploadObject(storageKey, file.buffer, file.type);

  const { width, height } = getImageDimensions(file.buffer, file.type);

  const mediaRow = await createMedia(database, {
    storageKey,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    width,
    height,
    altText: altText ?? null,
    uploadedBy: userId,
  });

  return { ...mediaRow, url: getPublicUrl(mediaRow.storageKey) };
}

export async function getMedia(id: string) {
  const mediaRow = await getMediaById(database, id);

  if (!mediaRow) {
    throw new NotFoundError(`Media not found: ${id}`);
  }

  return { ...mediaRow, url: getPublicUrl(mediaRow.storageKey) };
}

export async function listMedia(params: ListMediaParams = {}) {
  const { rows, total, limit, offset } = await dbListMedia(database, params);

  return {
    media: rows.map((row) => ({ ...row, url: getPublicUrl(row.storageKey) })),
    total,
    limit,
    offset,
  };
}

export async function updateMedia(
  id: string,
  data: { altText?: string | null; filename?: string },
) {
  const mediaRow = await dbUpdateMedia(database, id, data);

  if (!mediaRow) {
    throw new NotFoundError(`Media not found: ${id}`);
  }

  return { ...mediaRow, url: getPublicUrl(mediaRow.storageKey) };
}

export async function deleteMedia(id: string) {
  const mediaRow = await getMediaById(database, id);

  if (!mediaRow) {
    throw new NotFoundError(`Media not found: ${id}`);
  }

  // Check if the media ID is referenced in any document's prosemirror_json
  const referenced = await isMediaReferenced(id);

  await deleteObject(mediaRow.storageKey);
  await dbDeleteMedia(database, id);

  return { id, referenced };
}

async function isMediaReferenced(mediaId: string): Promise<boolean> {
  try {
    const { sql } = await import("@braille-docs/db");

    const result = await database.execute(
      sql`SELECT EXISTS (
        SELECT 1 FROM documents
        WHERE prosemirror_json::text LIKE ${"%" + mediaId + "%"}
           OR published_prosemirror_json::text LIKE ${"%" + mediaId + "%"}
      ) AS referenced`,
    );

    const row = result.rows[0] as { referenced: boolean } | undefined;
    return row?.referenced ?? false;
  } catch {
    return false;
  }
}
