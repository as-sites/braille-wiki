# 06 — API Core

## Scope

Implement the full Hono API server with all REST endpoints defined in the OpenAPI spec (plan 04). Use `@hono/zod-openapi` to annotate routes with OpenAPI metadata and Zod validation. This plan creates the complete backend API — document CRUD, revisions, navigation, public endpoints — but delegates publishing logic (plan 08), search (plan 09), media (plan 11), and MCP (plan 12) to their own plans.

## Prerequisites

- **02 — Database Package** (query functions)
- **03 — Shared Packages** (types, enums, path utils, editor schema)
- **04 — OpenAPI Spec** (contract to implement against)
- **05 — Auth** (middleware, session/API key validation)

## Unblocks

- 07 (Editor + BrailleBlock — needs API to save/load documents)
- 08 (Publish Flow — needs the base API and service functions)
- 09 (Search — needs the Hono app to mount search endpoint)
- 10 (Public Docs Site — needs public API endpoints)
- 11 (Media — needs the Hono app to mount media routes)
- 12 (MCP Server — needs service functions to wrap as tools)
- 13 (Admin UI Shell — needs all admin endpoints)

## Reference Docs

- `plans/routes.md` — Complete route map (sections 2a–2c)
- `plans/database-schema.md` — Data model, key queries
- `plans/project-instructions.md` — "Data Flow Summary" section
- `plans/build/04-openapi-spec.md` — The OpenAPI contract

## Packages to Install

In `apps/api/package.json` (in addition to packages from plan 05):

| Package | Type | Purpose |
|---------|------|---------|
| `@hono/zod-openapi` | dependency | OpenAPI-annotated route definitions with Zod validation |
| `@hono/node-server` | dependency | Node.js adapter (may already be installed from plan 05) |
| `zod` | dependency | Validation schemas (peer dep) |

Also add workspace dependencies:
- `@braille-docs/db: "workspace:*"`
- `@braille-docs/shared: "workspace:*"`
- `@braille-docs/editor-schema: "workspace:*"`

## Deliverables

```
apps/api/
├── src/
│   ├── index.ts                  # Entry point — creates Hono app, mounts routes, starts server
│   ├── app.ts                    # Hono app creation with global middleware (CORS, error handler, logging)
│   ├── auth/                     # (from plan 05)
│   ├── routes/
│   │   ├── index.ts              # Aggregates all route groups
│   │   ├── public/
│   │   │   ├── documents.ts      # GET /api/documents/:path, /children, /tree, /backlinks
│   │   │   └── search.ts         # GET /api/search (stub — implemented in plan 09)
│   │   └── admin/
│   │       ├── documents.ts      # CRUD: GET/POST/PUT/DELETE /api/admin/documents
│   │       ├── publishing.ts     # POST publish/unpublish/discard (stubs — logic in plan 08)
│   │       ├── revisions.ts      # GET revisions, GET revision, POST rollback
│   │       ├── navigation.ts     # PUT move, PUT reorder
│   │       ├── media.ts          # Stub routes (implemented in plan 11)
│   │       ├── users.ts          # GET/POST/PUT/DELETE /api/admin/users
│   │       └── api-keys.ts       # GET/POST/DELETE /api/admin/api-keys
│   ├── services/
│   │   ├── index.ts              # Re-exports all service functions
│   │   ├── documents.ts          # Business logic for document operations
│   │   ├── revisions.ts          # Business logic for revision operations
│   │   ├── navigation.ts         # Business logic for move/reorder
│   │   ├── publishing.ts         # Stub — filled in plan 08
│   │   ├── search.ts             # Stub — filled in plan 09
│   │   └── users.ts              # Business logic for user management
│   ├── openapi/
│   │   └── schemas.ts            # Zod schemas for all request/response types (derived from OpenAPI spec)
│   └── lib/
│       └── errors.ts             # Standardized error responses (400, 401, 403, 404, 409, 422)
├── package.json
└── tsconfig.json
```

## Requirements

### Application Setup (`src/app.ts`)

- Create Hono app with `OpenAPIHono` from `@hono/zod-openapi`
- Global middleware stack:
  1. CORS (allow admin SPA origin, credentials)
  2. Request logging (method, path, status, duration)
  3. Global error handler (catch unhandled errors, return standardized error response)
- Mount auth routes at `/api/auth/*` (from plan 05)
- Mount public routes (no auth)
- Mount admin routes with `requireAuth` middleware
- Mount user management routes with `requireAuth` + `requireAdmin` middleware

### Entry Point (`src/index.ts`)

- Import the app from `app.ts`
- Start the server on `PORT` env var (default 3001)
- On startup: log the server URL

### OpenAPI Route Definitions

Use `@hono/zod-openapi`'s `createRoute()` to define each endpoint with:
- Zod request validation (params, query, body)
- Zod response schemas
- OpenAPI metadata (summary, tags, security)
- The route definitions should match the OpenAPI spec from plan 04

### Service Layer (`src/services/`)

Each service function encapsulates business logic and calls `@braille-docs/db` query functions. Routes are thin — they validate input, call a service function, and return the response.

#### `services/documents.ts`

- `getDocuments(filters)` — Calls `listDocuments()` from db package
- `getDocument(id)` — Calls `getDocumentById()`. Returns 404 if not found.
- `createDocument(data, userId)` — Validates slug uniqueness, computes full path from parent + slug, calls `createDocument()` from db, creates initial revision with action `'save'`
- `saveDocument(id, data, userId)` — Calls `updateDocument()`, creates revision with action `'save'`. Returns the updated document.
- `archiveDocument(id, userId)` — Sets status to `'archived'`. If was published, needs to invalidate caches (delegates to publishing service). Creates revision.

#### `services/revisions.ts`

- `getRevisions(documentId, pagination)` — Calls `getRevisions()` from db. Returns paginated list.
- `getRevision(revisionId)` — Calls `getRevisionById()`. Returns 404 if not found.
- `rollbackDocument(documentId, revisionId, userId)` — Loads revision's prosemirror_json, writes it to document's prosemirror_json, creates revision with action `'rollback'`. Does NOT auto-publish.

#### `services/navigation.ts`

- `moveDocument(id, newParentPath, newSlug, userId)` — Validates new path doesn't conflict. Calls `moveDocument()` from db. Returns updated document.
- `reorderChildren(parentPath, orderedIds)` — Calls `reorderSiblings()` from db.

#### `services/users.ts`

- `getUsers()` — Lists all users from better-auth's user table.
- `createUser(data)` — Creates user via better-auth's admin API.
- `updateUser(id, data, currentUser)` — Updates user. Guard: editors cannot change roles. Admins cannot demote other admins unless they are also admin.
- `deleteUser(id, currentUser)` — Deletes user. Guard: admins cannot delete themselves. Editors cannot delete anyone.

#### `services/publishing.ts` (STUB)

- Export function signatures for `publishDocument()`, `unpublishDocument()`, `discardDraft()`
- Implementation comes in plan 08
- The route handlers in `routes/admin/publishing.ts` should call these stubs

#### `services/search.ts` (STUB)

- Export function signature for `searchDocuments()`
- Implementation comes in plan 09

### Public Endpoints (`src/routes/public/`)

#### `documents.ts`

- `GET /api/documents/:path` → calls `getPublishedDocument(path)`. Returns 404 if not found or not published.
- `GET /api/documents/:path/children` → calls `getChildren()`. Returns empty array if none.
- `GET /api/documents/:path/tree` → calls `getSidebarTree()`. Builds nested tree structure from flat results.
- `GET /api/documents/:path/backlinks` → calls `getBacklinks()`.

Note: The `:path` parameter is a catch-all that can contain slashes (e.g., `nemeth/chapter-3/rule-7`). Use Hono's wildcard param syntax.

### Error Handling (`src/lib/errors.ts`)

- `NotFoundError` — 404
- `ValidationError` — 400
- `UnauthorizedError` — 401
- `ForbiddenError` — 403
- `ConflictError` — 409 (duplicate path)
- `BusinessLogicError` — 422 (e.g., discard on never-published doc)

Each throws a structured error that the global error handler catches and formats as `{ error: string, message: string }`.

### OpenAPI Spec Serving

- Serve the generated OpenAPI spec at `GET /api/openapi.json` (auto-generated by `@hono/zod-openapi`)
- Optionally serve Swagger UI at `GET /api/docs` using `@hono/swagger-ui`

## Verification

1. `pnpm --filter @braille-docs/api typecheck` passes
2. `pnpm --filter @braille-docs/api dev` starts the server
3. Test each endpoint category:
   - **Public:** `GET /api/documents/some-path` returns published doc or 404
   - **Admin CRUD:** Create, read, update, archive a document via authenticated requests
   - **Revisions:** Save creates a revision, list revisions returns them, rollback restores content
   - **Navigation:** Move a document updates its path and descendants
   - **Users:** Admin can list/create/update/delete users; editor gets 403 on user endpoints
   - **API Keys:** Generate a key, use it in `x-api-key` header, verify it authenticates
4. `GET /api/openapi.json` returns a valid OpenAPI spec
5. Error responses match the standardized format
6. Unauthenticated requests to `/api/admin/*` return 401

## Notes

- The service layer is the **single source of business logic**. Routes are thin wrappers. MCP tools (plan 12) will call the same service functions.
- Publishing, search, and media routes are stubs in this plan. They have route definitions and call stub service functions that return "not implemented" or empty results. Plans 08, 09, and 11 fill in the implementations.
- The catch-all path parameter (`:path` with slashes) may need special handling in Hono. Test with paths like `nemeth/chapter-3/rule-7`.
- User management goes through better-auth's admin API where possible, not direct DB queries.
- The `GET /api/documents/children` route (no path param, for root-level works) needs to be distinguished from `GET /api/documents/:path/children`. Consider using a query param or a separate route.
