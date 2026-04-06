import {
  createRevision,
  db,
  getDocumentById,
  publishDocument as dbPublishDocument,
  rebuildLinksForDocument,
  unpublishDocument as dbUnpublishDocument,
  updateDocument,
  type ProsemirrorDocument,
} from "@braille-docs/db";
import { serializeToHtmlServer } from "@braille-docs/editor-schema/server";

import { docCacheTag, invalidateCacheTags } from "../lib/cache";
import { BusinessLogicError, NotFoundError } from "../lib/errors";
import { extractInternalLinks } from "../lib/link-parser";
import { indexPublishedDocument, removeDocumentFromSearchIndex } from "./search";

function isRootLevel(path: string): boolean {
  return !path.includes("/");
}

/**
 * Publish a document: serialize → store → snapshot → rebuild links →
 * update search index → invalidate cache.
 */
export async function publishDocument(documentId: string, userId: string) {
  const document = await getDocumentById(db, documentId);

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const prosemirrorJson = document.prosemirrorJson as object ?? {};
  const renderedHtml = serializeToHtmlServer(prosemirrorJson);

  const published = await dbPublishDocument(
    db,
    documentId,
    renderedHtml,
    prosemirrorJson as ProsemirrorDocument,
  );

  if (!published) {
    throw new NotFoundError("Document not found after publish");
  }

  await createRevision(db, {
    documentId,
    prosemirrorJson: prosemirrorJson as ProsemirrorDocument,
    action: "publish",
    createdBy: userId,
  });

  const targetPaths = extractInternalLinks(prosemirrorJson);
  const previousLinks = await rebuildLinksForDocument(db, document.path, targetPaths);

  const changedBacklinkPaths = previousLinks.map((link) => link.targetPath);

  await indexPublishedDocument({
    path: published.path,
    title: published.title,
    description: published.description,
    prosemirrorJson: published.prosemirrorJson,
  });

  const cacheTags = [docCacheTag(published.path)];

  for (const path of changedBacklinkPaths) {
    cacheTags.push(docCacheTag(path));
  }

  if (isRootLevel(published.path)) {
    cacheTags.push(docCacheTag("index"));
  }

  await invalidateCacheTags(cacheTags);

  return published;
}

/**
 * Unpublish a document: set status to draft, clear rendered_html,
 * remove from search index, invalidate cache.
 */
export async function unpublishDocument(documentId: string, userId: string) {
  const document = await getDocumentById(db, documentId);

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  if (document.status !== "published") {
    throw new BusinessLogicError("Document is not published");
  }

  await createRevision(db, {
    documentId,
    prosemirrorJson: document.prosemirrorJson as ProsemirrorDocument,
    action: "save",
    createdBy: userId,
  });

  const unpublished = await dbUnpublishDocument(db, documentId);

  if (!unpublished) {
    throw new NotFoundError("Document not found after unpublish");
  }

  await removeDocumentFromSearchIndex(document.path);
  await invalidateCacheTags([docCacheTag(document.path)]);

  return unpublished;
}

/**
 * Discard draft changes: restore prosemirror_json from the last published snapshot.
 */
export async function discardDraft(documentId: string, userId: string) {
  const document = await getDocumentById(db, documentId);

  if (!document) {
    throw new NotFoundError("Document not found");
  }

  if (!document.publishedProsemirrorJson) {
    throw new BusinessLogicError(
      "Cannot discard draft: document has never been published",
    );
  }

  await createRevision(db, {
    documentId,
    prosemirrorJson: document.prosemirrorJson as ProsemirrorDocument,
    action: "save",
    createdBy: userId,
  });

  const restored = await updateDocument(db, documentId, {
    prosemirrorJson: document.publishedProsemirrorJson,
    updatedBy: userId,
  });

  if (!restored) {
    throw new NotFoundError("Document not found after discard");
  }

  return restored;
}
