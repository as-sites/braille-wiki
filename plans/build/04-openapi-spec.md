# 04 — OpenAPI Specification

## Scope

Write the complete OpenAPI 3.1 specification for all custom Hono API routes. This spec serves as the **contract document** between the backend API (plan 06), the admin SPA client (plan 07), and the MCP server (plan 12). It does NOT cover better-auth's built-in `/api/auth/*` routes.

## Prerequisites

- **02 — Database Package** (need to know the data model and field types)

## Unblocks

- 06 (API Core — implements routes per this spec)
- 07 (Editor + BrailleBlock — generates TypeScript client from this spec)
- All feature plans that consume the API

## Reference Docs

- `plans/routes.md` — Complete route map with request/response details
- `plans/database-schema.md` — Column types for request/response schemas
- `plans/project-instructions.md` — Auth model, MCP auth model

## Packages to Install

None — this plan produces a static YAML file, not code.

## Deliverables

```
packages/shared/
└── openapi.yaml                  # The OpenAPI 3.1 specification
```

The spec lives in `packages/shared` because both the API (for validation/serving) and the admin SPA (for client generation) need access to it.

## Requirements

### Spec Format

- OpenAPI 3.1.0
- YAML format (easier to read and maintain than JSON)
- Use `$ref` for shared component schemas to avoid duplication

### Info Block

- `title: "Braille Documentation Platform API"`
- `version: "1.0.0"`
- `description` referencing the three consumers (admin SPA, public site search, MCP server)

### Security Schemes

Define two schemes in `components/securitySchemes`:

1. **`sessionAuth`** — Cookie-based session (type: `apiKey`, in: `cookie`, name: `better-auth.session_token`). Used by the admin SPA.
2. **`apiKeyAuth`** — API key header (type: `apiKey`, in: `header`, name: `x-api-key`). Used by MCP clients and external integrations.

### Tags

Organize endpoints by tag:

- `Public` — Unauthenticated endpoints
- `Documents` — Admin document CRUD
- `Publishing` — Publish/unpublish/discard
- `Revisions` — Version history and rollback
- `Navigation` — Move and reorder
- `Media` — Media upload and management
- `Users` — User management (admin only)
- `API Keys` — API key management
- `Search` — Full-text search
- `Internal` — Internal cache invalidation (not publicly exposed)

### Endpoint Specifications

Cover every route from `plans/routes.md` section 2 (Hono API). For each endpoint, define:

- HTTP method and path
- Summary and description
- Request parameters (path, query)
- Request body schema (where applicable)
- Response schemas (success + error cases)
- Security requirements
- Tags

#### Public Endpoints (no auth)

| Method | Path | Operation ID |
|--------|------|-------------|
| `GET` | `/api/search` | `searchDocuments` |
| `GET` | `/api/documents/{path}` | `getPublishedDocument` |
| `GET` | `/api/documents/{path}/children` | `getDocumentChildren` |
| `GET` | `/api/documents/{path}/tree` | `getDocumentTree` |
| `GET` | `/api/documents/{path}/backlinks` | `getDocumentBacklinks` |

#### Authenticated Endpoints (session or API key)

**Documents:**

| Method | Path | Operation ID |
|--------|------|-------------|
| `GET` | `/api/admin/documents` | `listDocuments` |
| `POST` | `/api/admin/documents` | `createDocument` |
| `GET` | `/api/admin/documents/{id}` | `getDocumentById` |
| `PUT` | `/api/admin/documents/{id}` | `updateDocument` |
| `DELETE` | `/api/admin/documents/{id}` | `archiveDocument` |

**Publishing:**

| Method | Path | Operation ID |
|--------|------|-------------|
| `POST` | `/api/admin/documents/{id}/publish` | `publishDocument` |
| `POST` | `/api/admin/documents/{id}/unpublish` | `unpublishDocument` |
| `POST` | `/api/admin/documents/{id}/discard` | `discardDraft` |

**Revisions:**

| Method | Path | Operation ID |
|--------|------|-------------|
| `GET` | `/api/admin/documents/{id}/revisions` | `listRevisions` |
| `GET` | `/api/admin/revisions/{revisionId}` | `getRevision` |
| `POST` | `/api/admin/documents/{id}/rollback/{revisionId}` | `rollbackDocument` |

**Navigation:**

| Method | Path | Operation ID |
|--------|------|-------------|
| `PUT` | `/api/admin/documents/{id}/move` | `moveDocument` |
| `PUT` | `/api/admin/documents/reorder` | `reorderChildren` |

**Media:**

| Method | Path | Operation ID |
|--------|------|-------------|
| `GET` | `/api/admin/media` | `listMedia` |
| `POST` | `/api/admin/media` | `uploadMedia` |
| `PUT` | `/api/admin/media/{id}` | `updateMedia` |
| `DELETE` | `/api/admin/media/{id}` | `deleteMedia` |

**Users (admin only):**

| Method | Path | Operation ID |
|--------|------|-------------|
| `GET` | `/api/admin/users` | `listUsers` |
| `POST` | `/api/admin/users` | `createUser` |
| `PUT` | `/api/admin/users/{id}` | `updateUser` |
| `DELETE` | `/api/admin/users/{id}` | `deleteUser` |

**API Keys:**

| Method | Path | Operation ID |
|--------|------|-------------|
| `GET` | `/api/admin/api-keys` | `listApiKeys` |
| `POST` | `/api/admin/api-keys` | `createApiKey` |
| `DELETE` | `/api/admin/api-keys/{id}` | `deleteApiKey` |

### Component Schemas

Define reusable schemas in `components/schemas`. Derive field types from the database schema:

- **`Document`** — Full document (all columns)
- **`DocumentSummary`** — Subset for list views: `id`, `path`, `title`, `status`, `updated_at`, `published_at`
- **`PublishedDocument`** — Public view: `title`, `description`, `rendered_html`, `metadata`, `published_at`
- **`DocumentTreeNode`** — Recursive: `path`, `title`, `position`, `description`, `children`
- **`DocumentBreadcrumb`** — `path`, `title`
- **`CreateDocumentRequest`** — `title`, `parent_path`, `slug`
- **`UpdateDocumentRequest`** — `prosemirror_json`, `title?`, `description?`, `metadata?`
- **`MoveDocumentRequest`** — `new_parent_path`, `new_slug?`
- **`ReorderRequest`** — `parent_path`, `children` (ordered array of UUIDs)
- **`Revision`** — `id`, `action`, `created_by`, `created_at`
- **`RevisionDetail`** — `Revision` + `prosemirror_json`
- **`Media`** — Full media row
- **`MediaUploadResponse`** — `Media` with the new record
- **`UpdateMediaRequest`** — `alt_text?`, `filename?`
- **`User`** — `id`, `name`, `email`, `role`, `created_at`
- **`CreateUserRequest`** — `name`, `email`, `role`
- **`UpdateUserRequest`** — `name?`, `role?`
- **`ApiKey`** — `id`, `name`, `created_at`, `last_used_at`
- **`ApiKeyCreateResponse`** — `ApiKey` + `key` (the raw key, shown once)
- **`CreateApiKeyRequest`** — `name`
- **`SearchResult`** — `path`, `title`, `snippet`, `score`
- **`SearchResponse`** — `results: SearchResult[]`, `total: number`
- **`ErrorResponse`** — `error: string`, `message: string`

### Response Patterns

Standardize error responses:

- `400` — Validation error (Zod parse failure)
- `401` — Not authenticated
- `403` — Insufficient permissions (e.g., editor trying to manage users)
- `404` — Resource not found
- `409` — Conflict (e.g., duplicate path on create/move)
- `422` — Business logic error (e.g., discard on never-published doc)

## Verification

1. Validate the spec with an OpenAPI linter (e.g., `npx @redocly/cli lint openapi.yaml`)
2. Every route from `plans/routes.md` section 2a-2c has a corresponding path in the spec
3. All `$ref` references resolve correctly
4. Request/response schemas match the database column types from `plans/database-schema.md`
5. Security requirements are correctly applied (public endpoints have none, admin endpoints require sessionAuth OR apiKeyAuth)

## Notes

- The MCP protocol endpoint (`POST /mcp`) is NOT in this spec — it uses the MCP protocol, not REST. The MCP tools are documented in plan 12.
- better-auth's `/api/auth/*` routes are NOT in this spec — they're managed by the library.
- The internal cache invalidation endpoint (`POST /internal/cache/invalidate`) on the Astro app is documented here under the `Internal` tag for completeness, but it's not exposed publicly.
- The `prosemirror_json` fields in request/response schemas should be typed as `object` (free-form JSON). Don't try to define the ProseMirror document structure in OpenAPI — it's complex and varies by extension set.
- The `path` parameter in public endpoints is a catch-all path (e.g., `nemeth/chapter-3/rule-7`). In OpenAPI, define it with `style: simple` to allow slashes.
