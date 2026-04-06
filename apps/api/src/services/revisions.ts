import { db } from "@braille-docs/db";
import {
  getRevisions as dbGetRevisions,
  getRevisionById as dbGetRevisionById,
  createRevision,
} from "@braille-docs/db";
import { getDocumentById } from "@braille-docs/db";

import {
  NotFoundError,
} from "../lib/errors";

const database = db;

/**
 * Get revision history for a document.
 */
export async function getRevisions(
  documentId: string,
  pagination?: { limit?: number; offset?: number },
) {
  const revisions = await dbGetRevisions(database, documentId, pagination);
  return revisions;
}

/**
 * Get a specific revision by ID.
 */
export async function getRevision(revisionId: string) {
  const revision = await dbGetRevisionById(database, revisionId);

  if (!revision) {
    throw new NotFoundError(`Revision not found: ${revisionId}`);
  }

  return revision;
}

/**
 * Rollback a document to a previous revision.
 * Loads the revision's prosemirrorJson as the current working draft.
 */
export async function rollbackDocument(
  documentId: string,
  revisionId: string,
  userId: string,
) {
  // Get the document
  const document = await getDocumentById(database, documentId);

  if (!document) {
    throw new NotFoundError(`Document not found: ${documentId}`);
  }

  // Get the target revision
  const sourceRevision = await dbGetRevisionById(database, revisionId);

  if (!sourceRevision) {
    throw new NotFoundError(`Revision not found: ${revisionId}`);
  }

  if (sourceRevision.documentId !== documentId) {
    throw new NotFoundError(
      `Revision does not belong to this document`,
    );
  }

  // Update the document with the revision's prosemirrorJson
  const { updateDocument } = await import("@braille-docs/db");
  const updated = await updateDocument(database, documentId, {
    prosemirrorJson: sourceRevision.prosemirrorJson,
    updatedBy: userId,
  });

  if (!updated) {
    throw new NotFoundError(`Document not found: ${documentId}`);
  }

  // Create a new revision recording this rollback
  await createRevision(database, {
    documentId,
    prosemirrorJson: sourceRevision.prosemirrorJson,
    action: "rollback",
    createdBy: userId,
  });

  return updated;
}
