# 02 — Database Package

## Scope

Implement `packages/db` — the shared database layer. Define all Drizzle ORM table schemas, set up the Neon Postgres connection, generate migrations, create reusable query functions, and generate Zod validation schemas from table definitions.

## Prerequisites

- **01 — Monorepo Scaffolding** (workspace structure must exist)

## Unblocks

- 03 (Shared Packages — needs Drizzle types)
- 04 (OpenAPI Spec — needs schema knowledge)
- 05 (Auth — needs DB connection and user table integration)
- 06 (API Core — needs query functions)

## Reference Docs

- `plans/database-schema.md` — Complete table definitions, indexes, key queries, ER diagram
- `plans/tech-stack.md` — "Shared / Cross-Cutting" and "packages/db" sections
- `plans/project-instructions.md` — "Data Model" section

## Packages to Install

In `packages/db/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `drizzle-orm` | dependency | ORM / query builder |
| `@neondatabase/serverless` | dependency | Neon Postgres driver (HTTP + WebSocket) |
| `drizzle-zod` | dependency | Generate Zod schemas from Drizzle tables |
| `zod` | dependency | Schema validation (peer dep of drizzle-zod) |
| `drizzle-kit` | devDependency | Migration CLI, Drizzle Studio |

## Deliverables

```
packages/db/
├── src/
│   ├── index.ts                  # Public API — re-exports client, schemas, queries
│   ├── client.ts                 # Drizzle client setup with Neon driver
│   ├── schema/
│   │   ├── index.ts              # Re-exports all table schemas
│   │   ├── documents.ts          # documents table
│   │   ├── document-revisions.ts # document_revisions table
│   │   ├── document-links.ts     # document_links table
│   │   └── media.ts              # media table
│   ├── queries/
│   │   ├── index.ts              # Re-exports all query functions
│   │   ├── documents.ts          # Document query functions
│   │   ├── revisions.ts          # Revision query functions
│   │   ├── links.ts              # Document links query functions
│   │   └── media.ts              # Media query functions
│   └── validation.ts             # drizzle-zod generated Zod schemas
├── drizzle/                      # Generated migration files (from drizzle-kit)
├── drizzle.config.ts             # Drizzle Kit configuration
├── package.json
└── tsconfig.json
```

## Requirements

### Connection (`src/client.ts`)

- Use `@neondatabase/serverless` with `neon()` HTTP driver for queries
- Create and export a `db` instance via `drizzle(neon(process.env.DATABASE_URL))`
- Export the connection for use by both `apps/api` and `apps/web`

### Table Schemas

All schemas follow `plans/database-schema.md` exactly. Key details:

#### `documents` (`src/schema/documents.ts`)

| Column | Drizzle Type | Constraints |
|--------|-------------|-------------|
| `id` | `uuid().primaryKey().defaultRandom()` | |
| `path` | `text().notNull().unique()` | Indexed |
| `slug` | `text().notNull()` | |
| `position` | `integer().notNull().default(0)` | |
| `title` | `text().notNull()` | |
| `description` | `text()` | Nullable |
| `metadata` | `jsonb()` | Nullable |
| `status` | `text().notNull().default('draft')` | `'draft' \| 'published' \| 'archived'` |
| `prosemirror_json` | `jsonb()` | Nullable |
| `published_prosemirror_json` | `jsonb()` | Nullable |
| `rendered_html` | `text()` | Nullable |
| `created_by` | `uuid()` | FK to auth user |
| `updated_by` | `uuid()` | FK to auth user |
| `created_at` | `timestamp({ withTimezone: true }).defaultNow()` | |
| `updated_at` | `timestamp({ withTimezone: true }).defaultNow()` | |
| `published_at` | `timestamp({ withTimezone: true })` | Nullable |

Indexes:
- Unique on `path`
- Partial index on `status` where `status = 'published'`

#### `document_revisions` (`src/schema/document-revisions.ts`)

| Column | Drizzle Type | Constraints |
|--------|-------------|-------------|
| `id` | `uuid().primaryKey().defaultRandom()` | |
| `document_id` | `uuid().notNull().references(() => documents.id)` | |
| `prosemirror_json` | `jsonb().notNull()` | |
| `action` | `text().notNull()` | `'save' \| 'publish' \| 'rollback'` |
| `created_by` | `uuid()` | FK to auth user |
| `created_at` | `timestamp({ withTimezone: true }).defaultNow()` | |

Indexes:
- Composite on `(document_id, created_at DESC)`

#### `document_links` (`src/schema/document-links.ts`)

| Column | Drizzle Type |
|--------|-------------|
| `source_path` | `text().notNull()` |
| `target_path` | `text().notNull()` |

Primary key: composite `(source_path, target_path)`

Indexes:
- Index on `target_path`

#### `media` (`src/schema/media.ts`)

| Column | Drizzle Type | Constraints |
|--------|-------------|-------------|
| `id` | `uuid().primaryKey().defaultRandom()` | |
| `storage_key` | `text().notNull()` | |
| `filename` | `text().notNull()` | |
| `mime_type` | `text().notNull()` | |
| `size_bytes` | `integer().notNull()` | |
| `width` | `integer()` | Nullable |
| `height` | `integer()` | Nullable |
| `alt_text` | `text()` | Nullable |
| `uploaded_by` | `uuid()` | FK to auth user |
| `created_at` | `timestamp({ withTimezone: true }).defaultNow()` | |

### Query Functions (`src/queries/`)

#### `documents.ts`

- `getPublishedDocument(path: string)` — Single published doc by path. Returns full row or null.
- `getSidebarTree(rootPath: string)` — All published docs under a root path, ordered by path + position. Returns `{ path, title, position }[]`.
- `getChildren(parentPath: string, depth: number)` — Immediate children of a path (published only), ordered by position. The `depth` param is the expected `ARRAY_LENGTH` of children's path segments.
- `getRootWorks()` — All published docs with single-segment paths, ordered by position.
- `getBreadcrumbs(path: string)` — All ancestor docs for a given path (published only), ordered by depth.
- `getDocumentById(id: string)` — Single doc by UUID, any status. For admin use.
- `listDocuments(filters: { status?, search?, parentPath? })` — Filtered list for admin. Supports status filter, title search, subtree scoping.
- `createDocument(data)` — Insert new doc with computed path.
- `updateDocument(id, data)` — Update prosemirror_json, title, description, metadata, updated_at.
- `archiveDocument(id)` — Set status to 'archived'.
- `moveDocument(id, newParentPath, newSlug?)` — Update path for doc and all descendants.
- `reorderSiblings(parentPath, orderedIds)` — Update position values for siblings.

#### `revisions.ts`

- `createRevision(data)` — Insert a revision row.
- `getRevisions(documentId, { limit, offset })` — Paginated history, newest first.
- `getRevisionById(revisionId)` — Single revision with prosemirror_json.

#### `links.ts`

- `getBacklinks(targetPath)` — Published docs that link to a given path.
- `rebuildLinksForDocument(sourcePath, targetPaths[])` — Delete old links, insert new ones.

#### `media.ts`

- `createMedia(data)` — Insert media row.
- `getMediaById(id)` — Single media record.
- `listMedia(filters: { mimeType?, search? })` — Filtered list.
- `updateMedia(id, data)` — Update alt_text, filename.
- `deleteMedia(id)` — Delete row.

### Validation Schemas (`src/validation.ts`)

- Use `drizzle-zod` to generate insert and select schemas for all tables
- Export `insertDocumentSchema`, `selectDocumentSchema`, etc.
- These will be used by the Hono API for request validation

### Drizzle Config (`drizzle.config.ts`)

- `dialect: "postgresql"`
- `schema: "./src/schema/index.ts"`
- `out: "./drizzle"` (migration output directory)
- `dbCredentials.url` from `process.env.DATABASE_URL`

### Package Scripts

- `"db:generate"` — `drizzle-kit generate`
- `"db:migrate"` — `drizzle-kit migrate`
- `"db:push"` — `drizzle-kit push` (for dev iteration)
- `"db:studio"` — `drizzle-kit studio`

## Verification

1. `pnpm --filter @braille-wiki/db db:generate` produces migration files without errors
2. `pnpm --filter @braille-wiki/db db:push` applies schema to a test Neon database
3. `pnpm --filter @braille-wiki/db typecheck` passes
4. Manual test: import `db` and run a simple query (e.g., `getRootWorks()`) against the test database
5. Zod schemas export correctly and validate sample data

## Notes

- Do NOT define auth tables here — better-auth manages its own tables (plan 05)
- The `created_by` and `updated_by` columns reference better-auth's user table. Use raw `uuid()` type for now; the FK relationship will be established when better-auth creates its user table.
- The `prosemirror_json` and `published_prosemirror_json` columns store ProseMirror document JSON. They're typed as `jsonb()` — no Zod validation of their internal structure at the DB layer.
- Query functions should accept the `db` instance as a parameter (dependency injection) to support testing and different connection contexts.
