# Database Schema

Postgres on Neon. Static files (images, etc.) stored in Cloudflare R2.

---

## `documents`

The core table. Every piece of content — whether a top-level work (the Nemeth codebook, the UEB manual, an original guide) or a deeply nested rule within one — is a row in this table. Hierarchy is encoded entirely in the `path` column. Root documents (single-segment paths like `nemeth`) serve as "works" and can carry work-level metadata in the `metadata` JSONB column.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. |
| `path` | TEXT | Full materialized path, e.g. `nemeth/chapter-3/rule-7`. Unique, indexed. The primary lookup key for the public site. |
| `slug` | TEXT | Final segment of the path, e.g. `rule-7`. Used for display and URL construction. |
| `position` | INTEGER | Ordering among siblings. Used for sidebar and navigation. |
| `title` | TEXT | Display title. |
| `description` | TEXT | Optional. For root documents, this is the work-level description. For inner pages, used for meta tags / search results. |
| `metadata` | JSONB | Optional. Bag for per-document data that doesn't warrant its own column. E.g. `{"source_attribution": "Nemeth Code, 1972 Revision", "cover_image_id": "..."}` on root documents. Null on most rows. |
| `status` | TEXT | Enum: `draft`, `published`, `archived`. Only `published` documents are visible on the public site. |
| `prosemirror_json` | JSONB | Current editor state (latest draft). Source of truth for the admin editor. |
| `published_prosemirror_json` | JSONB | Snapshot of `prosemirror_json` at last publish. Used for "discard draft changes" (reload this into the editor) and as the baseline for diffing. Null if never published. |
| `rendered_html` | TEXT | Pre-rendered HTML from last publish. Source of truth for the public docs site. Null if never published. |
| `created_by` | UUID | FK to auth user. |
| `updated_by` | UUID | FK to auth user. |
| `created_at` | TIMESTAMPTZ | Row creation. |
| `updated_at` | TIMESTAMPTZ | Last save (draft or publish). |
| `published_at` | TIMESTAMPTZ | Last publish. Null if never published. |

### Indexes

- **`documents_path_unique`** — Unique index on `path`. Primary lookup for the public site.
- **`documents_status_idx`** — Partial index on `status = 'published'`. Public site queries should never scan drafts.

### Key queries

```sql
-- Resolve a URL to a page
SELECT * FROM documents WHERE path = 'nemeth/chapter-3/rule-7' AND status = 'published';

-- Sidebar tree for a work
SELECT path, title, position FROM documents
WHERE path LIKE 'nemeth/%' OR path = 'nemeth'
AND status = 'published'
ORDER BY path, position;

-- Breadcrumbs for a page (all ancestors)
SELECT * FROM documents
WHERE path IN ('nemeth', 'nemeth/chapter-3', 'nemeth/chapter-3/rule-7')
AND status = 'published'
ORDER BY ARRAY_LENGTH(STRING_TO_ARRAY(path, '/'), 1);

-- Children of a specific page
SELECT * FROM documents
WHERE path LIKE 'nemeth/chapter-3/%'
AND ARRAY_LENGTH(STRING_TO_ARRAY(path, '/'), 1) = 3
AND status = 'published'
ORDER BY position;

-- All root-level works
SELECT * FROM documents
WHERE path NOT LIKE '%/%'
AND status = 'published'
ORDER BY position;

-- Move a subtree (rare operation)
UPDATE documents
SET path = REPLACE(path, 'nemeth/old-chapter', 'nemeth/new-chapter'),
    slug = SPLIT_PART(
      REPLACE(path, 'nemeth/old-chapter', 'nemeth/new-chapter'),
      '/',
      ARRAY_LENGTH(STRING_TO_ARRAY(REPLACE(path, 'nemeth/old-chapter', 'nemeth/new-chapter'), '/'), 1)
    )
WHERE path = 'nemeth/old-chapter' OR path LIKE 'nemeth/old-chapter/%';
```

---

## `document_revisions`

Append-only history. A row is inserted every time an editor saves. The `documents` table is the "head pointer"; this table is the log.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. |
| `document_id` | UUID | FK to `documents.id`. |
| `prosemirror_json` | JSONB | Snapshot of the document content at this point in time. |
| `action` | TEXT | Enum: `save`, `publish`, `rollback`. What triggered this revision. |
| `created_by` | UUID | FK to auth user. Who made the change. |
| `created_at` | TIMESTAMPTZ | When this revision was created. |

### Indexes

- **`revisions_document_id_created_at_idx`** — Composite index on `(document_id, created_at DESC)`. Powers "show history for this page" queries.

### Key queries

```sql
-- Version history for a page
SELECT id, action, created_by, created_at FROM document_revisions
WHERE document_id = ? ORDER BY created_at DESC;

-- Load a specific old version (for viewing or rollback)
SELECT prosemirror_json FROM document_revisions WHERE id = ?;
```

### Future consideration

This table will grow proportionally to save frequency × page count. Not a concern at launch, but eventually consider a retention policy — e.g. keep all revisions from the last 30 days, collapse to one-per-day for older history. This can be a simple scheduled job that deletes rows.

---

## `document_links`

Materialized cross-reference table. Tracks which documents link to which. Rebuilt per-document at publish time by parsing internal links from the ProseMirror JSON. This is a derived cache — it could be dropped and fully regenerated from `prosemirror_json` at any time.

Exists primarily to support "pages that link here" on the public site and to drive cache invalidation when a page's backlinks change.

| Column | Type | Notes |
|---|---|---|
| `source_path` | TEXT | Path of the document containing the link. |
| `target_path` | TEXT | Path of the document being linked to. |

Primary key: `(source_path, target_path)`.

### Indexes

- **`document_links_target_path_idx`** — Index on `target_path`. Powers "what links here?" queries.

### Key queries

```sql
-- "Pages that link here" for the public site
SELECT d.path, d.title FROM document_links l
JOIN documents d ON d.path = l.source_path AND d.status = 'published'
WHERE l.target_path = 'nemeth/chapter-3/rule-7';
```

### Publish-time rebuild flow

1. Query `document_links WHERE source_path = ?` to get the old link set.
2. Parse internal links from the new ProseMirror JSON to get the new link set.
3. Delete old rows, insert new rows for the published document.
4. Compute the symmetric difference (added + removed targets).
5. Invalidate cache tags for the published page and every page whose backlinks changed.

---

## `media`

Metadata registry for uploaded files. Actual bytes are stored in Cloudflare R2. The `storage_key` maps to the R2 object key.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. Referenced by ProseMirror image nodes. |
| `storage_key` | TEXT | R2 object key, e.g. `media/550e8400-e29b-41d4-a716-446655440000.png`. |
| `filename` | TEXT | Original upload filename. For display in the admin UI. |
| `mime_type` | TEXT | e.g. `image/png`, `image/jpeg`, `application/pdf`. |
| `size_bytes` | INTEGER | File size. |
| `width` | INTEGER | Nullable. Image dimensions, if applicable. |
| `height` | INTEGER | Nullable. Image dimensions, if applicable. |
| `alt_text` | TEXT | Alt text for accessibility. Important given the target audience. |
| `uploaded_by` | UUID | FK to auth user. |
| `created_at` | TIMESTAMPTZ | Upload timestamp. |

### How images are referenced

When an editor inserts an image in Tiptap, the ProseMirror JSON stores the `media.id`. At publish-time serialization, the renderer resolves the ID to a public R2 URL (or a CDN URL in front of R2) and writes the `<img>` tag with the resolved `src` and the `alt_text` from this table.

---

## Auth tables

Managed by **better-auth** (no Logto / external OIDC provider). better-auth creates and manages its own tables (`user`, `session`, `account`, etc.) via its built-in migration. Do not manually modify these.

**Plugins:**

- **API key plugin** (`@better-auth/api-key`) — provides API key generation and validation for MCP server access. Editors generate keys from the admin UI; MCP clients send them via `x-api-key` header; the API validates with `auth.api.validateApiKey()`.

**Role model:** A simple `role` column on the better-auth user table (better-auth supports extending its built-in user schema with additional fields). Two values: `admin` and `editor`. Both roles can create, edit, and publish content. The only distinction is that admins cannot be deleted or demoted by editors — this protects the account that controls the system. No RBAC plugin, no permissions engine. Just a guard check on destructive user-management operations.

| Role | Can edit/publish content | Can manage users | Can delete admins |
|---|---|---|---|
| `admin` | Yes | Yes | No (only another admin) |
| `editor` | Yes | No | No |

---

## Entity relationship summary

```
documents (1) ←——— (many) document_revisions
documents.path ←——— document_links.source_path
documents.path ←——— document_links.target_path
media.id ←——— referenced in documents.prosemirror_json
```

---

## Decisions reflected here

| Decision | Rationale |
|---|---|
| No `books` table | Root documents (single-segment paths) serve as works. One entity type, one table, uniform CRUD. |
| No `parent_id` / recursive tree | Hierarchy is encoded in `path`. Children, ancestors, and breadcrumbs are all derivable from path queries. Avoids recursive CTEs entirely. |
| No derived columns (`depth`, `root_slug`, `is_root`) | All derivable from `path` at query time with negligible cost at this scale. Avoids sync obligations on every path change. If ever needed for performance, use a functional index or materialized view. |
| `metadata` JSONB instead of sparse columns | Work-level attributes like source attribution, content type, and cover images vary per document and are display-only. A JSONB bag avoids migrations for each new field and keeps the table lean. |
| `published_prosemirror_json` instead of a revisions-based draft/publish model | Simpler. Editors save freely to `prosemirror_json`, publish snapshots to `published_prosemirror_json` + `rendered_html`. Revisions table provides full history separately. |
| `document_links` as a materialized cache | Needed for public-facing "pages that link here" and correct cache invalidation on publish. Derived entirely from ProseMirror JSON — droppable and rebuildable. |
| Cloudflare R2 for static files | S3-compatible, no infrastructure to manage, clean separation from the database. |
| No image bytes in Postgres | Avoids DB bloat, keeps Neon costs down, and images are served directly from R2/CDN without a DB round-trip. |
| better-auth only, no Logto | Two roles and API keys don't justify a separate identity service. better-auth's API key plugin handles MCP auth. Logto can be added as an OIDC provider later if needed. |