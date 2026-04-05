# Route Map

Three services, clear responsibilities. All business logic lives in the Hono API. The admin UI and MCP server are consumers of the same service functions — when the admin UI saves a document, it calls the same Hono endpoint the MCP's `update_document` tool calls, which calls the same internal `saveDocument()` function.

---

## 1. Public Docs — Astro + Starlight

All unauthenticated. Cached via Astro experimental route caching with tag-based invalidation. Astro queries Postgres directly for page rendering — it does not call the Hono API for SSR.

### Page Routes

| Route | Purpose | Cache Tag |
|---|---|---|
| `/` | Landing page. Lists all root-level works (single-segment paths, `status = 'published'`). | `doc:index` |
| `/[...path]` | Catch-all doc page. Resolves URL to `documents.path`, renders `rendered_html` with sidebar tree and breadcrumbs. 404 if no published match. | `doc:<path>` |

Search is handled by a modal/overlay on the public site that calls the Hono API's search endpoint. No dedicated search page route.

### Internal Endpoint

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/internal/cache/invalidate` | Called by the Hono API at publish/unpublish time. Accepts a list of cache tags to invalidate. Protected by a shared secret (`x-internal-secret` header). Only accessible on the internal Docker network — not exposed through Traefik. |

---

## 2. Hono API + MCP Server

Single Node process. All REST endpoints, MCP protocol handler, Orama search index, better-auth, and publish orchestration. Deployed as its own Docker container.

### 2a. Public API (no auth)

These serve the public site's client-side features (search modal, backlinks) and unauthenticated MCP access.

| Method | Route | Purpose | Used by |
|---|---|---|---|
| `GET` | `/api/search` | Full-text search via Orama. Query params: `q` (search term), `limit`, `offset`, `work` (optional — scope to a root path like `nemeth`). Returns titles, paths, snippets. | Public site search modal, MCP |
| `GET` | `/api/documents/:path` | Get a single published document by path. Returns title, description, rendered HTML, metadata, published_at. Only `status = 'published'`. | MCP |
| `GET` | `/api/documents/:path/children` | Immediate children of a path, ordered by position. Returns path, title, position, description. Only published. Omit `:path` (i.e. `GET /api/documents/children`) for root-level works. | MCP |
| `GET` | `/api/documents/:path/tree` | Full nested hierarchy under a root path. Returns the complete sidebar structure for an entire work. Only published. | MCP |
| `GET` | `/api/documents/:path/backlinks` | Pages that link to this path. Queries `document_links` joined with `documents` (published only). Returns path and title of linking pages. | MCP, public site |

### 2b. Auth Routes

| Method | Route | Purpose |
|---|---|---|
| `ALL` | `/api/auth/*` | better-auth's built-in routes (login, logout, session, callback, etc.). Mounted as a catch-all. The admin SPA's login flow and session management hit these. |

### 2c. Authenticated API (requires session or API key)

Session auth (cookie) for the admin SPA. API key (`x-api-key` header) for the MCP and external integrations. Both validated by better-auth. All routes under `/api/admin`.

#### Documents

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/documents` | List all documents (including drafts/archived). Supports filtering by status, searching by title, scoping to a subtree. Returns path, title, status, updated_at, published_at. |
| `POST` | `/api/admin/documents` | Create a new document. Body: title, parent path, slug, initial status (`draft`). Computes full path from parent + slug. Initializes empty `prosemirror_json`. Returns the new document. |
| `GET` | `/api/admin/documents/:id` | Get a single document by UUID. Returns everything: `prosemirror_json` (working draft), `published_prosemirror_json`, title, path, status, metadata, timestamps. This is what the editor loads. |
| `PUT` | `/api/admin/documents/:id` | Save draft. Body: `prosemirror_json`, optionally `title`, `description`, `metadata`. Updates `prosemirror_json` and `updated_at`. Creates a row in `document_revisions` with `action: 'save'`. Does **not** publish. |
| `DELETE` | `/api/admin/documents/:id` | Archive a document (sets `status: 'archived'`). Does not hard-delete. Invalidates Astro cache if it was published. Removes from Orama index. |

#### Publishing

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/admin/documents/:id/publish` | Full publish flow: serialize `prosemirror_json` → HTML, write `rendered_html` and `published_prosemirror_json`, set `status: 'published'`, set `published_at`, rebuild `document_links` for this document, update Orama index, call Astro's `POST /internal/cache/invalidate` with tag `doc:<path>`. Creates a revision with `action: 'publish'`. |
| `POST` | `/api/admin/documents/:id/unpublish` | Set `status: 'draft'`. Clear `rendered_html`. Remove from Orama index. Call Astro's cache invalidation. The document disappears from the public site but the content is preserved. |
| `POST` | `/api/admin/documents/:id/discard` | Discard draft changes. Reset `prosemirror_json` back to `published_prosemirror_json`. Returns the restored content. Fails if the document has never been published (nothing to restore to). |

#### Revisions

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/documents/:id/revisions` | List revision history. Returns id, action, created_by, created_at. Paginated, newest first. |
| `GET` | `/api/admin/revisions/:revisionId` | Get a specific revision's `prosemirror_json`. For viewing old versions or preparing a rollback. |
| `POST` | `/api/admin/documents/:id/rollback/:revisionId` | Rollback: loads the revision's `prosemirror_json` into the document's `prosemirror_json` (as a new draft). Creates a revision with `action: 'rollback'`. Does **not** auto-publish — the editor can review and publish manually. |

#### Navigation / Tree

| Method | Route | Purpose |
|---|---|---|
| `PUT` | `/api/admin/documents/:id/move` | Move a document (and its subtree) to a new parent. Body: `new_parent_path`, `new_slug` (optional). Updates `path` for the document and all descendants. Invalidates Astro cache tags for all affected paths. Rebuilds `document_links` for affected documents. Updates Orama index entries. |
| `PUT` | `/api/admin/documents/reorder` | Reorder siblings. Body: `parent_path` and `children` (ordered array of document IDs). Updates `position` values. Invalidates Astro cache tag for the parent (sidebar may have changed). |

#### Media

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/media` | List media. Supports filtering by mime_type, searching by filename/alt_text. Returns id, filename, mime_type, size, dimensions, alt_text, R2 URL. |
| `POST` | `/api/admin/media` | Upload a file to R2. Accepts multipart form data. Creates a `media` row. Returns the new media record with its ID (for insertion into Tiptap). |
| `PUT` | `/api/admin/media/:id` | Update media metadata (alt_text, filename). |
| `DELETE` | `/api/admin/media/:id` | Delete media. Removes from R2 and deletes the row. Should warn if the media ID is referenced in any document's `prosemirror_json`. |

#### Users (admin role only)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/users` | List all users. Returns id, name, email, role, created_at. |
| `POST` | `/api/admin/users` | Create/invite a user. Body: name, email, role. |
| `PUT` | `/api/admin/users/:id` | Update user (role, name). Guard: editors cannot promote/demote admins. |
| `DELETE` | `/api/admin/users/:id` | Delete a user. Guard: admins cannot be deleted by editors; an admin cannot delete themselves. |

#### API Keys

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/api-keys` | List API keys for the current user (or all, if admin). Returns id, name/label, created_at, last_used_at. Never returns the key value itself after creation. |
| `POST` | `/api/admin/api-keys` | Generate a new API key. Body: name/label. Returns the key value **once** (must be copied immediately). |
| `DELETE` | `/api/admin/api-keys/:id` | Revoke an API key. |

### 2d. MCP Protocol

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/mcp` | MCP Streamable HTTP transport endpoint. Handles MCP protocol messages (tool listing, tool calls). The MCP SDK processes the protocol; tool implementations call the same service functions as the REST endpoints. |

Auth model: no `x-api-key` header → public tools only. Valid API key → public + authenticated tools.

#### Public Tools (no auth)

| Tool | Calls service function | Parameters | Returns |
|---|---|---|---|
| `search_docs` | `searchDocuments()` | `query` (required), `work` (optional, e.g. `nemeth`), `limit` (optional) | Array of {path, title, snippet, score} |
| `get_document` | `getPublishedDocument()` | `path` (required) | Title, description, rendered HTML, metadata, published_at |
| `get_children` | `getChildren()` | `path` (optional — omit for root-level works) | Array of {path, title, position, description} |
| `get_tree` | `getTree()` | `path` (required, e.g. `nemeth`) | Nested tree structure of the entire work |
| `get_backlinks` | `getBacklinks()` | `path` (required) | Array of {path, title} — pages that link to this one |

#### Authenticated Tools (require API key)

| Tool | Calls service function | Parameters | Returns |
|---|---|---|---|
| `get_draft` | `getDocumentById()` | `id` (required) | Full document including `prosemirror_json` (working draft), status, metadata |
| `update_document` | `saveDocument()` | `id` (required), `prosemirror_json` (required), `title` (optional), `description` (optional) | Updated document |
| `publish_document` | `publishDocument()` | `id` (required) | Confirmation with published_at timestamp |
| `unpublish_document` | `unpublishDocument()` | `id` (required) | Confirmation |
| `get_history` | `getRevisions()` | `id` (required), `limit` (optional) | Array of {revision_id, action, created_by, created_at} |
| `get_revision` | `getRevisionById()` | `revision_id` (required) | The revision's `prosemirror_json` |
| `rollback_document` | `rollbackDocument()` | `id` (required), `revision_id` (required) | Updated document (as new draft) |
| `move_document` | `moveDocument()` | `id` (required), `new_parent_path` (required), `new_slug` (optional) | Updated document with new path |
| `reorder_children` | `reorderChildren()` | `parent_path` (required), `children` (required, ordered array of IDs) | Confirmation |

---

## 3. Admin UI — React Router (Client-Side)

All routes are client-side, rendered by the Vite + React SPA. The server serves `index.html` for all paths; React Router handles routing from there. Every data operation calls the Hono API endpoints above. Type safety is provided by Hono's RPC client (`hono/client`).

| Route | Purpose |
|---|---|
| `/login` | Login page. Initiates the better-auth flow via `/api/auth/*`. Redirects to `/` on success. |
| `/` | Dashboard home. Recent activity: recently edited documents, recent publishes. Quick links to frequently edited pages. |
| `/documents` | Document browser. Full tree view of all works and nested pages. Filterable by status (draft/published/archived). Searchable by title. Supports drag-and-drop reordering (calls `PUT /api/admin/documents/reorder`). |
| `/documents/new` | Create a new document. Form: title, parent (tree picker), slug (auto-generated from title, editable). Calls `POST /api/admin/documents`, then redirects to the editor. |
| `/documents/:id/edit` | The Tiptap editor. Loads `prosemirror_json` via `GET /api/admin/documents/:id`. Save calls `PUT /api/admin/documents/:id`. Publish calls `POST /api/admin/documents/:id/publish`. Also surfaces: document status, last published timestamp, discard draft button, metadata editing (title, description, metadata JSONB). |
| `/documents/:id/preview` | Preview. Renders the current draft through the same serializer the publish step uses, so editors see exactly what the public page will look like. Read-only. |
| `/documents/:id/history` | Revision history. Lists revisions from `GET /api/admin/documents/:id/revisions`. View any old version (read-only in the editor). Rollback button calls `POST /api/admin/documents/:id/rollback/:revisionId`, then redirects to the editor. |
| `/media` | Media library. Browse, search, upload, edit alt text, delete. Grid/list view of all media with thumbnails. |
| `/settings` | Account settings and admin panel. All users: profile, change password, API key management (generate/revoke keys for MCP access). Admin-only section: user management (list, invite, change roles, delete). |

---

## Architecture Diagram

```
                          ┌──────────────┐
                          │   Traefik    │
                          │   (proxy)    │
                          └──────┬───────┘
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
           ┌──────────────┐ ┌────────┐ ┌──────────────┐
           │  Astro +     │ │  Hono  │ │  Admin SPA   │
           │  Starlight   │ │  API   │ │  (static)    │
           │              │ │        │ │              │
           │ • Page SSR   │ │ • REST │ │ • React      │
           │ • Route      │ │ • MCP  │ │ • Tiptap     │
           │   cache      │ │ • Auth │ │ • React      │
           │              │ │ • Orama│ │   Router     │
           └──────┬───────┘ │ • R2   │ └──────┬───────┘
                  │         └───┬────┘        │
                  │    internal  │             │
                  │◄────────────┘  ◄───────────┘
                  │  cache         API calls
                  │  invalidate    (session cookie)
                  │
                  ▼
           ┌──────────────┐     ┌──────────────┐
           │   Postgres   │     │ Cloudflare   │
           │   (Neon)     │     │ R2 (media)   │
           └──────────────┘     └──────────────┘
```

**Data flow for each consumer:**

- **Public site (Astro):** Queries Postgres directly during SSR. Does not go through the Hono API. Client-side search modal calls `GET /api/search` on Hono.
- **Admin SPA:** All operations go through the Hono API via session-authenticated requests.
- **MCP clients:** All operations go through the Hono API's MCP transport (`POST /mcp`) or REST endpoints, authenticated via API key for write operations.
- **Hono → Astro:** Internal cache invalidation call at publish/unpublish time. Only point of cross-service communication.