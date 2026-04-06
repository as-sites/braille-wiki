import type { ProsemirrorDocument } from "@braille-wiki/db";
import { search } from "@orama/orama";

import { ValidationError } from "../lib/errors";
import {
  addToIndex,
  getIndex,
  removeFromIndex,
} from "../lib/search-index";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SNIPPET_LENGTH = 160;

interface SearchOptions {
  work?: string;
  limit?: number;
  offset?: number;
}

interface SearchableDocument {
  path: string;
  title: string;
  description: string;
  content: string;
  work: string;
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  return limit;
}

function normalizeOffset(offset?: number): number {
  if (offset === undefined) {
    return 0;
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new ValidationError("offset must be a non-negative integer");
  }

  return offset;
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function createSnippetFromText(text: string, queryTerms: string[]): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "";
  }

  const lowerText = normalizedText.toLowerCase();
  let matchIndex = -1;

  for (const term of queryTerms) {
    matchIndex = lowerText.indexOf(term);

    if (matchIndex >= 0) {
      break;
    }
  }

  if (matchIndex < 0) {
    return normalizedText.slice(0, SNIPPET_LENGTH).trim();
  }

  const start = Math.max(0, matchIndex - Math.floor(SNIPPET_LENGTH / 2));
  const end = Math.min(normalizedText.length, start + SNIPPET_LENGTH);
  const snippet = normalizedText.slice(start, end).trim();

  return `${start > 0 ? "... " : ""}${snippet}${end < normalizedText.length ? " ..." : ""}`;
}

function buildSnippet(document: SearchableDocument, query: string): string {
  const queryTerms = tokenizeQuery(query);
  const snippetSources = [document.description, document.content, document.title];

  for (const source of snippetSources) {
    const snippet = createSnippetFromText(source, queryTerms);

    if (snippet) {
      return snippet;
    }
  }

  return "";
}

/**
 * Search documents.
 */
export async function searchDocuments(
  query: string,
  options: SearchOptions = {},
) {
  const term = query.trim();

  if (!term) {
    throw new ValidationError("q must be a non-empty string");
  }

  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const work = options.work?.trim() || undefined;
  const index = await getIndex();
  const response = await search(index, {
    term,
    properties: ["title", "description", "content"],
    limit,
    offset,
    ...(work ? { where: { work } } : {}),
  });

  const hits = Array.isArray((response as { hits?: unknown }).hits)
    ? ((response as { hits: Array<{ score?: number; document?: SearchableDocument }> }).hits)
    : [];
  const total = typeof (response as { count?: unknown }).count === "number"
    ? (response as { count: number }).count
    : hits.length;

  return {
    results: hits.map((hit) => {
      const document = hit.document;

      return {
        path: document?.path ?? "",
        title: document?.title ?? "",
        snippet: document ? buildSnippet(document, term) : "",
        score: hit.score ?? 0,
      };
    }),
    total,
    limit,
    offset,
  };
}

export async function indexPublishedDocument(document: {
  path: string;
  title: string;
  description?: string | null;
  prosemirrorJson: ProsemirrorDocument | null;
}) {
  await addToIndex({
    path: document.path,
    title: document.title,
    description: document.description ?? null,
    prosemirrorJson: document.prosemirrorJson,
  });
}

export async function removeDocumentFromSearchIndex(path: string) {
  await removeFromIndex(path);
}
