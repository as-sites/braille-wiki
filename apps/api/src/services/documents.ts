import { db } from "@braille-wiki/db";
import type {
  DocumentListFilters,
} from "@braille-wiki/db";
import {
  createDocument as dbCreateDocument,
  getDocumentById as dbGetDocumentById,
  getPublishedDocument as dbGetPublishedDocument,
  listDocuments as dbListDocuments,
  updateDocument as dbUpdateDocument,
  archiveDocument as dbArchiveDocument,
  getSidebarTree,
  getChildren,
  getBacklinks,
  getRootWorks,
} from "@braille-wiki/db";
import { createRevision } from "@braille-wiki/db";

import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../lib/errors";

const database = db;

function createEmptyProsemirrorDoc(): Record<string, unknown> {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

/**
 * Get a published document by path (public read endpoint).
 */
export async function getPublishedDocument(path: string) {
  const document = await dbGetPublishedDocument(database, path);

  if (!document) {
    throw new NotFoundError(`Document not found: ${path}`);
  }

  return document;
}

/**
 * Get a document by ID (admin endpoint).
 */
export async function getDocument(id: string) {
  const document = await dbGetDocumentById(database, id);

  if (!document) {
    throw new NotFoundError(`Document not found: ${id}`);
  }

  return document;
}

/**
 * List all documents with optional filters (admin endpoint).
 */
export async function getDocuments(filters?: DocumentListFilters) {
  const documents = await dbListDocuments(database, filters);
  return documents;
}

/**
 * Create a new document.
 */
export async function createDocument(
  data: {
    title: string;
    slug: string;
    parentPath?: string | null;
    description?: string;
  },
  userId: string,
) {
  // Validate slug format (alphanumeric, hyphens, underscores)
  if (!/^[a-z0-9_-]+$/.test(data.slug)) {
    throw new ValidationError(
      "Slug must contain only lowercase letters, numbers, hyphens, and underscores",
    );
  }

  // Check if a document with this path already exists
  const existingDocuments = await dbListDocuments(database, {});
  const fullPath = data.parentPath
    ? `${data.parentPath}/${data.slug}`
    : data.slug;

  if (existingDocuments.some((d) => d.path === fullPath)) {
    throw new ConflictError(`Document already exists at path: ${fullPath}`);
  }

  // Create the document
  const document = await dbCreateDocument(database, {
    parentPath: data.parentPath ?? null,
    slug: data.slug,
    title: data.title,
    description: data.description ?? null,
    status: "draft",
    prosemirrorJson: createEmptyProsemirrorDoc(),
    createdBy: userId,
    updatedBy: userId,
  });

  // Create initial revision
  await createRevision(database, {
    documentId: document.id,
    prosemirrorJson: (document.prosemirrorJson ??
      createEmptyProsemirrorDoc()) as any,
    action: "save",
    createdBy: userId,
  });

  return document;
}

/**
 * Save a document (update working draft).
 */
export async function saveDocument(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    prosemirrorJson?: Record<string, unknown>;
  },
  userId: string,
) {
  const document = await dbGetDocumentById(database, id);

  if (!document) {
    throw new NotFoundError(`Document not found: ${id}`);
  }

  // Update the document
  const updated = await dbUpdateDocument(database, id, {
    title: data.title,
    description: data.description,
    prosemirrorJson: data.prosemirrorJson,
    updatedBy: userId,
  });

  if (!updated) {
    throw new NotFoundError(`Document not found: ${id}`);
  }

  // Create revision
  await createRevision(database, {
    documentId: id,
    prosemirrorJson: (data.prosemirrorJson ??
      updated.prosemirrorJson ??
      createEmptyProsemirrorDoc()) as any,
    action: "save",
    createdBy: userId,
  });

  return updated;
}

/**
 * Archive a document.
 */
export async function archiveDocument(id: string, userId: string) {
  const document = await dbGetDocumentById(database, id);

  if (!document) {
    throw new NotFoundError(`Document not found: ${id}`);
  }

  const updated = await dbArchiveDocument(database, id);

  // Create revision if there's content
  if (updated) {
    await createRevision(database, {
      documentId: id,
      prosemirrorJson: (updated.prosemirrorJson ??
        createEmptyProsemirrorDoc()) as any,
      action: "save",
      createdBy: userId,
    });
  }

  return updated;
}

/**
 * Get the sidebar tree (published documents only).
 */
export async function getTree(rootPath: string) {
  const results = await getSidebarTree(database, rootPath);

  if (results.length === 0) {
    throw new NotFoundError(`Root path not found: ${rootPath}`);
  }

  // Build nested tree from flat results
  const buildTree = (
    parentPath: string | null,
  ): Array<{
    path: string;
    title: string;
    position: number;
    children: Array<any>;
  }> => {
    return results
      .filter((node) => {
        if (parentPath === null) {
          return !node.path.includes("/");
        }
        const pathPrefix = `${parentPath}/`;
        return node.path.startsWith(pathPrefix) &&
          node.path.slice(pathPrefix.length).split("/").length === 1
          ? true
          : false;
      })
      .map((node: any) => ({
        ...node,
        children: buildTree(node.path),
      }))
      .sort((a, b) => a.position - b.position);
  };

  return buildTree(null);
}

/**
 * Get immediate children (published only).
 */
export async function getChildrenForPath(
  parentPath: string | null,
) {
  if (parentPath === null) {
    // Root-level works
    const works = await getRootWorks(database);
    return works;
  }

  const depth = parentPath.split("/").length + 1;
  return getChildren(database, parentPath, depth);
}

/**
 * Get backlinks (pages that link to this document).
 */
export async function getBacklinksForDocument(path: string) {
  return getBacklinks(database, path);
}
