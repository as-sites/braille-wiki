# 09 — Search

## Scope

Set up the Orama full-text search engine in the Hono API process. Build the initial index from Postgres on startup, provide incremental update functions for publish/unpublish events, and implement the public search endpoint.

## Prerequisites

- **02 — Database Package** (query functions to load all published documents for initial index)
- **06 — API Core** (Hono app to mount the search endpoint, stub to fill in)

## Unblocks

- 08 (Publish Flow — needs incremental index update functions)
- 10 (Public Docs Site — search modal calls the search endpoint)

## Reference Docs

- `plans/project-instructions.md` — "Search index" in the Hono section, "Key Architectural Risks" #3 (memory) and #5 (braille exclusion)
- `plans/routes.md` — `GET /api/search` endpoint
- `plans/tech-stack.md` — Orama entry

## Packages to Install

In `apps/api/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `@orama/orama` | dependency | In-memory full-text search engine |

## Deliverables

```
apps/api/
├── src/
│   ├── services/
│   │   └── search.ts             # Fill in stub from plan 06
│   ├── lib/
│   │   ├── search-index.ts       # Orama index setup, build, and management
│   │   └── text-extractor.ts     # Extract searchable text from ProseMirror JSON
│   └── routes/
│       └── public/
│           └── search.ts         # Fill in stub from plan 06
```

## Requirements

### Orama Index Setup (`src/lib/search-index.ts`)

#### Schema

Create an Orama index with the following schema:

- `path` — string (the document path, used as the document ID)
- `title` — string (searchable)
- `description` — string (searchable)
- `content` — string (searchable — extracted prose text, excluding BrailleBlock content)
- `work` — string (root segment of the path, e.g., `nemeth` — for filtering/faceting)

#### `buildIndex()`

- Called on Hono server startup
- Query all published documents from Postgres (path, title, description, prosemirror_json)
- For each document:
  - Extract searchable text from `prosemirror_json` using `extractSearchableText()` (see below)
  - Insert into the Orama index
- Log the number of documents indexed and time taken

#### `addToIndex(document)`

- Called by the publish flow (plan 08) after a document is published
- Inserts or updates the document in the Orama index
- Extracts searchable text from `prosemirror_json`

#### `removeFromIndex(path)`

- Called by the unpublish flow and archive flow
- Removes the document from the Orama index by path

#### `getIndex()`

- Returns the Orama index instance for use by the search service

### Text Extractor (`src/lib/text-extractor.ts`)

#### `extractSearchableText(prosemirrorJson: object): string`

- Walk the ProseMirror JSON tree recursively
- Collect text content from all text nodes
- **Exclude** text content inside `brailleBlock` nodes — raw ASCII braille is not useful for search
- Join text with spaces
- Return a single string of searchable prose content

### Search Service (`src/services/search.ts`)

Fill in the stub from plan 06:

#### `searchDocuments(query, options)`

Parameters:
- `query: string` — the search term
- `options.work?: string` — optional, scope to a root path (e.g., `nemeth`)
- `options.limit?: number` — default 20, max 100
- `options.offset?: number` — default 0

Implementation:
- Call `search()` on the Orama index
- If `work` is specified, filter results to documents whose `work` field matches
- Map results to `{ path, title, snippet, score }`
- The `snippet` should be a text fragment around the match (Orama provides this via its highlight/snippet features)
- Return `{ results, total }`

### Search Endpoint (`src/routes/public/search.ts`)

Fill in the stub from plan 06:

- `GET /api/search`
- Query parameters: `q` (required), `limit` (optional), `offset` (optional), `work` (optional)
- Validate with Zod: `q` must be a non-empty string, `limit` must be 1-100, `offset` must be >= 0
- Returns `{ results: SearchResult[], total: number }`
- No authentication required

### Server Startup Integration

In `src/index.ts` (or app startup):
- Call `buildIndex()` after the Hono server starts listening
- Log when the index is ready
- The server should respond to requests immediately (don't block startup on index build). Search will return empty results until the index is ready.

## Verification

1. `pnpm --filter @braille-wiki/api dev` starts the server and logs "Search index built: X documents in Y ms"
2. `GET /api/search?q=braille` returns results with paths, titles, and snippets
3. `GET /api/search?q=braille&work=nemeth` returns only results from the Nemeth work
4. Search does NOT return results matching BrailleBlock content (e.g., searching for raw ASCII braille patterns returns no matches)
5. After publishing a document, it appears in search results
6. After unpublishing a document, it disappears from search results
7. Search returns results in relevance order (Orama's default scoring)
8. Empty query or missing `q` param returns 400

## Notes

- The Orama index is **in-memory**. A server restart means a full rebuild from Postgres. For ~2,000 documents this takes seconds — acceptable for single-instance deployment.
- BrailleBlock content exclusion is important: raw ASCII braille like `⠃⠗⠇` or `.brl` patterns are noise in search results. Only prose, titles, descriptions, and captions are indexed.
- The `work` field enables scoping search to a specific book/manual. It's derived from the first segment of the document path.
- Orama supports TypeScript natively and runs in Node without issues.
- Consider using Orama's `afterInsert` hook for any post-indexing logic if needed later.
