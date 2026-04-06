import sizeOf from "image-size";

import { db } from "@braille-wiki/db";
import {
  createMedia,
  deleteMedia as dbDeleteMedia,
  getMediaById,
  listMedia as dbListMedia,
  updateMedia as dbUpdateMedia,
} from "@braille-wiki/db";

import { NotFoundError } from "../lib/errors";
import { deleteObject, getPublicUrl, uploadObject } from "../lib/storage";

const database = db;

export interface UploadMediaInput {
  env: {
    MEDIA_BUCKET?: {
      put: (
        key: string,
        value: ArrayBuffer | ArrayBufferView | string,
        options?: { httpMetadata?: { contentType?: string } },
      ) => Promise<unknown>;
      delete: (key: string) => Promise<void>;
    };
    R2_PUBLIC_URL?: string;
    S3_PUBLIC_URL?: string;
  };
  file: {
    buffer: Uint8Array;
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
  buffer: Uint8Array,
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
  const { env, file, altText, userId } = input;
  const ext = getFileExtension(file.name);
  const uuid = crypto.randomUUID();
  const storageKey = `media/${uuid}${ext}`;

  await uploadObject(env, storageKey, file.buffer, file.type);

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

  return { ...mediaRow, url: getPublicUrl(env, mediaRow.storageKey) };
}

export async function getMedia(
  env: { R2_PUBLIC_URL?: string; S3_PUBLIC_URL?: string },
  id: string,
) {
  const mediaRow = await getMediaById(database, id);

  if (!mediaRow) {
    throw new NotFoundError(`Media not found: ${id}`);
  }

  return { ...mediaRow, url: getPublicUrl(env, mediaRow.storageKey) };
}

export async function listMedia(
  env: { R2_PUBLIC_URL?: string; S3_PUBLIC_URL?: string },
  params: ListMediaParams = {},
) {
  const { rows, total, limit, offset } = await dbListMedia(database, params);

  return {
    media: rows.map((row) => ({ ...row, url: getPublicUrl(env, row.storageKey) })),
    total,
    limit,
    offset,
  };
}

export async function updateMedia(
  env: { R2_PUBLIC_URL?: string; S3_PUBLIC_URL?: string },
  id: string,
  data: { altText?: string | null; filename?: string },
) {
  const mediaRow = await dbUpdateMedia(database, id, data);

  if (!mediaRow) {
    throw new NotFoundError(`Media not found: ${id}`);
  }

  return { ...mediaRow, url: getPublicUrl(env, mediaRow.storageKey) };
}

export async function deleteMedia(
  env: {
    MEDIA_BUCKET?: {
      put: (
        key: string,
        value: ArrayBuffer | ArrayBufferView | string,
        options?: { httpMetadata?: { contentType?: string } },
      ) => Promise<unknown>;
      delete: (key: string) => Promise<void>;
    };
  },
  id: string,
) {
  const mediaRow = await getMediaById(database, id);

  if (!mediaRow) {
    throw new NotFoundError(`Media not found: ${id}`);
  }

  // Check if the media ID is referenced in any document's prosemirror_json
  const referenced = await isMediaReferenced(id);

  await deleteObject(env, mediaRow.storageKey);
  await dbDeleteMedia(database, id);

  return { id, referenced };
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return "";
  }

  return filename.slice(lastDot).toLowerCase();
}

async function isMediaReferenced(mediaId: string): Promise<boolean> {
  try {
    const { sql } = await import("@braille-wiki/db");

    const result = await database.execute(
      sql`SELECT EXISTS (
        SELECT 1 FROM documents
        WHERE prosemirror_json::text LIKE ${"%" + mediaId + "%"}
           OR published_prosemirror_json::text LIKE ${"%" + mediaId + "%"}
      ) AS referenced`,
    );

    const rows = Array.isArray(result)
      ? result
      : (((result as unknown) as { rows?: Array<{ referenced: boolean }> }).rows ?? []);
    const row = rows[0] as { referenced: boolean } | undefined;
    return row?.referenced ?? false;
  } catch {
    return false;
  }
}
