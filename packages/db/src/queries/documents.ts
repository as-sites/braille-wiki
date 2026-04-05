import {
  and,
  asc,
  eq,
  ilike,
  inArray,
  like,
  notLike,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { DatabaseClient } from "../client";
import {
  documents,
  type DocumentMetadata,
  type DocumentStatus,
  type ProsemirrorDocument,
} from "../schema";

export interface DocumentListFilters {
  status?: DocumentStatus;
  search?: string;
  parentPath?: string;
}

export interface CreateDocumentInput {
  parentPath?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  metadata?: DocumentMetadata | null;
  status?: DocumentStatus;
  position?: number;
  prosemirrorJson?: ProsemirrorDocument | null;
  publishedProsemirrorJson?: ProsemirrorDocument | null;
  renderedHtml?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  publishedAt?: Date | null;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  metadata?: DocumentMetadata | null;
  prosemirrorJson?: ProsemirrorDocument | null;
  updatedBy?: string | null;
}

export interface PublishedDocumentSearchRecord {
  path: string;
  title: string;
  description: string | null;
  publishedProsemirrorJson: ProsemirrorDocument | null;
}

function buildPath(parentPath: string | null | undefined, slug: string): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

function buildSubtreeCondition(path: string): SQL {
  return sql`${documents.path} = ${path} or ${documents.path} like ${`${path}/%`}`;
}

function pathDepthExpression() {
  return sql<number>`array_length(string_to_array(${documents.path}, '/'), 1)`;
}

function siblingScopeCondition(parentPath?: string | null): SQL {
  if (!parentPath) {
    return notLike(documents.path, "%/%");
  }

  const depth = parentPath.split("/").length + 1;

  return sql`${documents.path} like ${`${parentPath}/%`} and ${pathDepthExpression()} = ${depth}`;
}

async function getNextSiblingPosition(
  database: DatabaseClient,
  parentPath?: string | null,
): Promise<number> {
  const [result] = await database
    .select({
      maxPosition: sql<number>`coalesce(max(${documents.position}), -1)`,
    })
    .from(documents)
    .where(siblingScopeCondition(parentPath));

  return (result?.maxPosition ?? -1) + 1;
}

export async function getPublishedDocument(
  database: DatabaseClient,
  path: string,
) {
  const [document] = await database
    .select()
    .from(documents)
    .where(and(eq(documents.path, path), eq(documents.status, "published")))
    .limit(1);

  return document ?? null;
}

export async function listPublishedDocumentsForSearch(
  database: DatabaseClient,
): Promise<PublishedDocumentSearchRecord[]> {
  return database
    .select({
      path: documents.path,
      title: documents.title,
      description: documents.description,
      publishedProsemirrorJson: documents.publishedProsemirrorJson,
    })
    .from(documents)
    .where(eq(documents.status, "published"))
    .orderBy(asc(documents.path));
}

export async function getSidebarTree(
  database: DatabaseClient,
  rootPath: string,
) {
  return database
    .select({
      path: documents.path,
      title: documents.title,
      position: documents.position,
    })
    .from(documents)
    .where(
      and(
        buildSubtreeCondition(rootPath),
        eq(documents.status, "published"),
      ),
    )
    .orderBy(asc(documents.path), asc(documents.position));
}

export async function getChildren(
  database: DatabaseClient,
  parentPath: string,
  depth: number,
) {
  return database
    .select()
    .from(documents)
    .where(
      and(
        like(documents.path, `${parentPath}/%`),
        eq(pathDepthExpression(), depth),
        eq(documents.status, "published"),
      ),
    )
    .orderBy(asc(documents.position), asc(documents.path));
}

export async function getRootWorks(database: DatabaseClient) {
  return database
    .select()
    .from(documents)
    .where(
      and(
        notLike(documents.path, "%/%"),
        eq(documents.status, "published"),
      ),
    )
    .orderBy(asc(documents.position), asc(documents.path));
}

export async function getBreadcrumbs(
  database: DatabaseClient,
  path: string,
) {
  const segments = path.split("/").filter(Boolean);
  const ancestorPaths = segments.map((_, index) =>
    segments.slice(0, index + 1).join("/"),
  );

  if (ancestorPaths.length === 0) {
    return [];
  }

  return database
    .select()
    .from(documents)
    .where(
      and(
        inArray(documents.path, ancestorPaths),
        eq(documents.status, "published"),
      ),
    )
    .orderBy(asc(pathDepthExpression()));
}

export async function getDocumentById(
  database: DatabaseClient,
  id: string,
) {
  const [document] = await database
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  return document ?? null;
}

export async function listDocuments(
  database: DatabaseClient,
  filters: DocumentListFilters = {},
) {
  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(documents.status, filters.status));
  }

  if (filters.search?.trim()) {
    conditions.push(ilike(documents.title, `%${filters.search.trim()}%`));
  }

  if (filters.parentPath) {
    conditions.push(buildSubtreeCondition(filters.parentPath));
  }

  return database
    .select()
    .from(documents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(documents.path), asc(documents.position));
}

export async function createDocument(
  database: DatabaseClient,
  data: CreateDocumentInput,
) {
  const path = buildPath(data.parentPath, data.slug);
  const position =
    data.position ?? (await getNextSiblingPosition(database, data.parentPath));

  const [document] = await database
    .insert(documents)
    .values({
      path,
      slug: data.slug,
      title: data.title,
      description: data.description ?? null,
      metadata: data.metadata ?? null,
      status: data.status ?? "draft",
      position,
      prosemirrorJson: data.prosemirrorJson ?? null,
      publishedProsemirrorJson: data.publishedProsemirrorJson ?? null,
      renderedHtml: data.renderedHtml ?? null,
      createdBy: data.createdBy ?? null,
      updatedBy: data.updatedBy ?? data.createdBy ?? null,
      publishedAt: data.publishedAt ?? null,
    })
    .returning();

  return document;
}

export async function updateDocument(
  database: DatabaseClient,
  id: string,
  data: UpdateDocumentInput,
) {
  const updates = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined
      ? { description: data.description }
      : {}),
    ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    ...(data.prosemirrorJson !== undefined
      ? { prosemirrorJson: data.prosemirrorJson }
      : {}),
    ...(data.updatedBy !== undefined ? { updatedBy: data.updatedBy } : {}),
    updatedAt: sql`now()`,
  };

  const [document] = await database
    .update(documents)
    .set(updates)
    .where(eq(documents.id, id))
    .returning();

  return document ?? null;
}

export async function archiveDocument(
  database: DatabaseClient,
  id: string,
) {
  const [document] = await database
    .update(documents)
    .set({
      status: "archived",
      updatedAt: sql`now()`,
    })
    .where(eq(documents.id, id))
    .returning();

  return document ?? null;
}

export async function moveDocument(
  database: DatabaseClient,
  id: string,
  newParentPath: string | null,
  newSlug?: string,
) {
  const document = await getDocumentById(database, id);

  if (!document) {
    return null;
  }

  if (
    newParentPath &&
    (newParentPath === document.path ||
      newParentPath.startsWith(`${document.path}/`))
  ) {
    throw new Error("Cannot move a document inside its own subtree.");
  }

  const targetSlug = newSlug ?? document.slug;
  const nextPath = buildPath(newParentPath, targetSlug);

  if (nextPath === document.path) {
    return document;
  }

  const prefixLength = document.path.length + 1;

  await database
    .update(documents)
    .set({
      path: sql`
        case
          when ${documents.path} = ${document.path} then ${nextPath}
          else ${nextPath} || substring(${documents.path} from ${prefixLength})
        end
      `,
      slug: sql`
        case
          when ${documents.path} = ${document.path} then ${targetSlug}
          else ${documents.slug}
        end
      `,
      updatedAt: sql`
        case
          when ${documents.path} = ${document.path} then now()
          else ${documents.updatedAt}
        end
      `,
    })
    .where(buildSubtreeCondition(document.path));

  return getDocumentById(database, id);
}

export async function reorderSiblings(
  database: DatabaseClient,
  parentPath: string | null,
  orderedIds: string[],
) {
  const reorderedDocuments = [];

  for (const [position, id] of orderedIds.entries()) {
    const [document] = await database
      .update(documents)
      .set({
        position,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(documents.id, id), siblingScopeCondition(parentPath)),
      )
      .returning();

    if (document) {
      reorderedDocuments.push(document);
    }
  }

  return reorderedDocuments.sort((left, right) => left.position - right.position);
}

export async function publishDocument(
  database: DatabaseClient,
  id: string,
  renderedHtml: string,
  publishedProsemirrorJson: ProsemirrorDocument,
) {
  const [document] = await database
    .update(documents)
    .set({
      status: "published",
      renderedHtml,
      publishedProsemirrorJson,
      publishedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(documents.id, id))
    .returning();

  return document ?? null;
}

export async function unpublishDocument(
  database: DatabaseClient,
  id: string,
) {
  const [document] = await database
    .update(documents)
    .set({
      status: "draft",
      renderedHtml: null,
      updatedAt: sql`now()`,
    })
    .where(eq(documents.id, id))
    .returning();

  return document ?? null;
}
