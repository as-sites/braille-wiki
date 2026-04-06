import { db, listPublishedDocumentsForSearch, type ProsemirrorDocument } from "@braille-wiki/db";
import { create, insert, remove } from "@orama/orama";

import { extractSearchableText } from "./text-extractor";

export interface SearchSourceDocument {
  path: string;
  title: string;
  description: string | null;
  prosemirrorJson: ProsemirrorDocument | null;
}

export interface SearchIndexDocument {
  path: string;
  title: string;
  description: string;
  content: string;
  work: string;
}

function createSearchIndex() {
  return create({
    schema: {
      path: "string",
      title: "string",
      description: "string",
      content: "string",
      work: "string",
    },
    components: {
      tokenizer: {
        stemming: true,
        stemmerSkipProperties: ["work"],
      },
    },
  });
}

type SearchIndex = Awaited<ReturnType<typeof createSearchIndex>>;

let indexPromise: Promise<SearchIndex> = Promise.resolve(createSearchIndex());
let pathToInternalId = new Map<string, string>();
let buildPromise: Promise<void> | null = null;
let hasBuiltInitialIndex = false;

function getWorkFromPath(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? path;
}

function toIndexDocument(document: SearchSourceDocument): SearchIndexDocument {
  return {
    path: document.path,
    title: document.title,
    description: document.description ?? "",
    content: extractSearchableText(document.prosemirrorJson),
    work: getWorkFromPath(document.path),
  };
}

async function upsertDocument(
  index: SearchIndex,
  idMap: Map<string, string>,
  document: SearchSourceDocument,
): Promise<void> {
  const existingId = idMap.get(document.path);

  if (existingId) {
    await remove(index, existingId);
  }

  const insertedId = await insert(index, toIndexDocument(document));
  idMap.set(document.path, insertedId);
}

export async function buildIndex(): Promise<void> {
  if (buildPromise) {
    return buildPromise;
  }

  buildPromise = (async () => {
    const startedAt = Date.now();
    const nextIndex = await createSearchIndex();
    const nextIdMap = new Map<string, string>();
    let documents: Awaited<ReturnType<typeof listPublishedDocumentsForSearch>> = [];

    try {
      documents = await listPublishedDocumentsForSearch(db);
    } catch (err: unknown) {
      const code = (err as any)?.cause?.code ?? (err as any)?.code;
      if (code === "42P01") {
        console.warn(
          "[api] Search index skipped: database tables not found. Run migrations first: pnpm --filter @braille-wiki/db db:push",
        );
      } else {
        throw err;
      }
    }

    for (const document of documents) {
      await upsertDocument(nextIndex, nextIdMap, {
        path: document.path,
        title: document.title,
        description: document.description,
        prosemirrorJson: document.publishedProsemirrorJson,
      });
    }

    indexPromise = Promise.resolve(nextIndex);
    pathToInternalId = nextIdMap;
    hasBuiltInitialIndex = true;

    console.log(
      `[api] Search index built: ${documents.length} documents in ${Date.now() - startedAt} ms`,
    );
  })().finally(() => {
    buildPromise = null;
  });

  return buildPromise;
}

export async function addToIndex(document: SearchSourceDocument): Promise<void> {
  const index = await getIndex();
  await upsertDocument(index, pathToInternalId, document);
}

export async function removeFromIndex(path: string): Promise<void> {
  const index = await getIndex();
  const internalId = pathToInternalId.get(path);

  if (!internalId) {
    return;
  }

  await remove(index, internalId);
  pathToInternalId.delete(path);
}

export async function getIndex(): Promise<SearchIndex> {
  if (!hasBuiltInitialIndex) {
    await buildIndex();
  }

  return indexPromise;
}
