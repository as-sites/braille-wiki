import { db } from "@braille-wiki/db";
import {
  moveDocument as dbMoveDocument,
  reorderSiblings as dbReorderSiblings,
  getDocumentById,
} from "@braille-wiki/db";

import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../lib/errors";

const database = db;

/**
 * Move a document to a new location in the tree.
 */
export async function moveDocument(
  id: string,
  newParentPath: string | null,
  newSlug?: string,
  _userId?: string,
) {
  const document = await getDocumentById(database, id);

  if (!document) {
    throw new NotFoundError(`Document not found: ${id}`);
  }

  // Validate slug if provided
  if (newSlug && !/^[a-z0-9_-]+$/.test(newSlug)) {
    throw new ValidationError(
      "Slug must contain only lowercase letters, numbers, hyphens, and underscores",
    );
  }

  try {
    const updated = await dbMoveDocument(
      database,
      id,
      newParentPath,
      newSlug,
    );

    if (!updated) {
      throw new NotFoundError(`Document not found: ${id}`);
    }

    return updated;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("subtree")) {
        throw new ConflictError(
          "Cannot move a document inside its own subtree",
        );
      }
    }
    throw error;
  }
}

/**
 * Reorder siblings within a parent path.
 */
export async function reorderChildren(
  parentPath: string | null,
  orderedIds: string[],
) {
  if (orderedIds.length === 0) {
    return [];
  }

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(orderedIds));

  if (uniqueIds.length !== orderedIds.length) {
    throw new ValidationError(
      "Duplicate document IDs in reorder list",
    );
  }

  const reordered = await dbReorderSiblings(
    database,
    parentPath,
    uniqueIds,
  );

  return reordered;
}
