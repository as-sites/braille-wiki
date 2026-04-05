# Braille Documentation Platform — Project Instructions

## Project Overview

A public documentation website for large-scale braille-related reference works, including a 1,500+ page codebook and a 350+ page manual. The system has three distinct parts: a public-facing documentation site, a backend API with an integrated MCP server, and a separate admin dashboard for non-technical content editors.

## Target Audience

### Public Site Visitors
- Braille transcribers, librarians, educators, and blind users.
- Screen reader accessibility on the public docs is a **top priority**.

### Content Editors (Admin Dashboard)
- Older staff, librarians, and some blind users. Highly non-technical.
- They must never see Git, Markdown, code, or terminal output. Everything is visual/WYSIWYG.
- Screen reader accessibility on the admin editor is a nice-to-have but not a hard requirement.

### MCP Consumers
- LLM-powered tools (e.g. Claude) that need to read, search, and optionally edit documentation content.
- Public tools require no auth. Write tools require an API key generated from the admin dashboard.

---

## Architecture: Three Services, Shared Database

### 1. Public Documentation Site — Astro + Starlight

- **Framework:** Astro (v6+) with Starlight for the documentation UI.
- **Rendering mode:** On-demand rendering (SSR) using Astro's Node adapter, running in a Docker container.
- **Caching strategy:** Uses Astro's **experimental route caching** (`experimental.cache`) for per-page caching with tag-based invalidation. This is the ISR equivalent — pages are cached after first render, and only the specific page an editor changed gets invalidated. No full-site rebuilds.
  - Each doc page is cached with a long `maxAge` and a `swr` (stale-while-revalidate) window.
  - On publish, the Hono API calls `POST /internal/cache/invalidate` on the Astro app to purge only the affected page(s).
  - The built-in `memoryCache` provider is acceptable for single-instance self-hosted deployment.
- **Content source:** Pages are rendered from pre-built HTML stored in Postgres (not from the filesystem). A custom Astro content loader or data-fetching layer queries the database for rendered content and hierarchy metadata (sidebar tree, breadcrumbs, etc.).
- **Search:** The public site's search modal calls the Hono API's search endpoint, which queries the in-memory Orama index. No client-side search index or static index files needed.
- **No API logic.** Astro handles page rendering only. All API endpoints, auth, and business logic live in the Hono service. The only server endpoint Astro exposes is an internal cache invalidation route, protected by a shared secret and accessible only on the internal Docker network.
- **Hosting:** Likely going to be hosted on Cloudflare Pages or Cloudflare Workers Sites unless I need specific features I can only obtain elsewhere, but ideally should not be tied to a specific vendor. If I need Docker-based deployment, I will probably use Railway with Traefik or Nginx.

### 2. Backend API + MCP Server — Hono

- **Framework:** Hono, a lightweight TypeScript-native HTTP framework, running on Node in a Docker container.
- **Responsibilities:** All business logic lives here. REST API endpoints for the admin SPA and public site, MCP protocol handler for LLM tool access, Orama search index in-memory, ProseMirror-to-HTML serialization at publish time, better-auth session and API key management, media upload orchestration to R2.
- **Why Hono over alternatives:** Proper middleware chaining, route grouping, and Zod-based request validation (`@hono/zod-validator`) without the weight of Fastify or the weak TypeScript support of Express. Hono's RPC mode (`hono/client`) provides type-safe client generation for the admin SPA without needing tRPC as a dependency.
- **MCP integration:** The MCP TypeScript SDK (`@modelcontextprotocol/sdk`) supports Streamable HTTP transport. The MCP protocol handler is mounted as a route within the Hono app. MCP tool implementations call the same internal service functions as the REST endpoints — no HTTP hop, no duplicated logic.
- **Search index:** Orama runs in-memory in the Hono process. Indexed from Postgres on startup, updated incrementally at publish/unpublish time. BrailleBlock content is stripped before indexing — only prose, titles, descriptions, and captions are searchable.
- **Cache invalidation:** When a publish action completes, the Hono service calls `POST /internal/cache/invalidate` on the Astro app (internal Docker network, shared secret) to purge the affected cache tags.
- **Hosting:** Likely going to be hosted on Cloudflare Pages or Cloudflare Workers Sites unless I need specific features I can only obtain elsewhere, but ideally should not be tied to a specific vendor. If I need Docker-based deployment, I will probably use Railway with Traefik or Nginx.

### 3. Admin Dashboard — Vite + React SPA

- **Framework:** Standalone Vite + React single-page application. Not an Astro island.
- **Rationale:** The editor experience requires persistent client-side state (ProseMirror/Tiptap editor state, unsaved changes, document tree sidebar). Astro islands destroy and remount on navigation, which is incompatible with a rich editing experience.
- **Routing:** React Router with a small number of routes (login, document tree browser, editor page, preview, history, media library, settings).
- **Data fetching:** All operations go through the Hono API. Hono's RPC client (`hono/client`) can provide end-to-end type safety between the API and the SPA.
- **Deployment:** Likely going to be hosted on Cloudflare Pages or Cloudflare Workers Sites unless I need specific features I can only obtain elsewhere, but ideally should not be tied to a specific vendor. If I need Docker-based deployment, I will probably use Railway with Traefik or Nginx.

---

## Editor: Tiptap (ProseMirror-based)

- **Library:** Tiptap (open-source core). No Tiptap Cloud or Hocuspocus — unnecessary for this use case.
- **Why Tiptap over alternatives:** Largest ProseMirror extension ecosystem, best-documented custom node API. BlockNote is too opinionated for deep custom nodes. Novel is too lightweight for 1,500+ pages.
- **Editor state format:** ProseMirror JSON is the source of truth, stored in Postgres.
- **No Markdown round-tripping.** ProseMirror JSON is serialized directly to rendered HTML at publish time by the Hono service. The rendered HTML is also stored in Postgres alongside the JSON. The Astro docs site reads the pre-rendered HTML — no runtime serialization on page load.

---

## The Critical Custom Node: BrailleBlock

The most important technical challenge. Braille translation examples require **exact spatial alignment and whitespace preservation** — a single extra or missing space makes the braille incorrect.

### Node Design
- Extend Tiptap's `CodeBlock` concept. The custom `BrailleBlock` node must set `code: true` and `preserveWhitespace: 'full'` in the ProseMirror schema to prevent whitespace normalization.
- Content: `text*` (plain text only, no inline formatting inside braille blocks).
- Rendered in the editor with a monospace font inside a visually distinct container (shaded box, labeled "Braille Translation Example").
- Attributes: at minimum `type` (e.g., "UEB Grade 1", "UEB Grade 2", "Nemeth") and optionally `caption` for descriptive text.

### Public Site Rendering
- Rendered as a `<pre>` element with `white-space: pre`, a monospace font, no line wrapping, and no font substitution.
- ARIA labeling for accessibility: `role="img"` with an `aria-label`, or a visually-hidden text alternative describing the braille content.
- CSS must prevent any reformatting, wrapping, or font fallback that could break alignment.

### Serialization
- The save-time serializer (running in the Hono service) must emit the raw text content of braille blocks **character-for-character** with no trimming, no newline normalization, and no entity encoding of spaces.
- End-to-end tests must assert exact character-level fidelity through the full save → serialize → render cycle. Build these tests before anything else.

---

## Authentication: better-auth

- **Auth library:** better-auth (successor to next-auth/auth.js). Runs in the Hono service.
- **No external identity provider.** Two roles and API keys don't justify a separate OIDC service. Logto can be added as an OIDC provider later if needed.
- **Scope:** Auth protects **only** the admin API and admin dashboard. The public documentation site and public API endpoints have zero authentication — fully open.
- **Session auth:** The admin SPA authenticates via better-auth (cookie-based sessions). better-auth's built-in routes are mounted in the Hono app at `/api/auth/*`.
- **API key auth:** The MCP server and any external integrations authenticate via API keys (`x-api-key` header), managed by better-auth's API key plugin (`@better-auth/api-key`). Editors generate keys from the admin UI settings page.
- **Traefik middleware** can provide an additional layer of protection at the reverse proxy level for the admin routes.

---

## MCP Server

An MCP (Model Context Protocol) server is integrated into the Hono service, providing LLM-friendly tool access to the documentation content.

### Transport
- Streamable HTTP, mounted as a route within the Hono app (`/mcp`).
- Uses the MCP TypeScript SDK (`@modelcontextprotocol/sdk`).

### Auth Model
- **No API key:** Public tools only — read published content, search, browse tree, check backlinks.
- **Valid API key** (via `x-api-key` header): Public tools plus write tools — get drafts, update content, publish/unpublish, view history, rollback, manage navigation order.
- API keys are validated via better-auth's API key plugin.

### Design Principle
- MCP tools call the same internal service functions as the REST API endpoints. There is one implementation of each operation (e.g., `publishDocument(id)`), consumed by both the REST layer and the MCP layer.

---

## Data Model (High-Level — Details in database-schema.md)

- **Database:** Postgres on Neon.
- **Per-document storage:**
  - `prosemirror_json` — the ProseMirror document JSON (source of truth for the editor).
  - `published_prosemirror_json` — snapshot at last publish (for discard-draft and diffing).
  - `rendered_html` — pre-rendered HTML output (source of truth for the public docs site).
  - `path`, `slug`, `position` — hierarchy and navigation metadata for building the sidebar tree.
  - `status` — `draft`, `published`, or `archived`. Only `published` documents are visible on the public site.
  - `updated_at`, `published_at` — timestamps.
- **Publish workflow:** Editors save freely (drafts). A separate "Publish" action in the Hono service serializes ProseMirror JSON to HTML, stores the rendered HTML, rebuilds cross-references, updates the Orama search index, and calls the Astro app to invalidate the cache for that page. This prevents half-edited content from going live.

---

## Data Flow Summary

1. Editor opens a document in the admin SPA → SPA calls `GET /api/admin/documents/:id` on the Hono API → ProseMirror JSON is loaded from Postgres → Tiptap renders it in the editor.
2. Editor makes changes and clicks "Save" → SPA calls `PUT /api/admin/documents/:id` → Hono writes ProseMirror JSON to Postgres (draft) and creates a revision.
3. Editor clicks "Publish" → SPA calls `POST /api/admin/documents/:id/publish` → Hono serializes ProseMirror JSON to HTML, stores `rendered_html` and `published_prosemirror_json`, rebuilds `document_links`, updates the Orama index, and calls `POST /internal/cache/invalidate` on the Astro app.
4. Next visitor hits the public docs page → Astro renders it fresh from the DB (cache miss), caches the result, and subsequent visitors get the cached version.

The same publish flow executes when an MCP client calls the `publish_document` tool — it hits the same service function.

---

## Infrastructure & Deployment

- **Hosting:** Self-hosted, Docker containers, behind Traefik reverse proxy.
- **No Vercel.** Cost concerns and vendor lock-in avoidance.
- **Three deployments:**
  1. **Astro docs site** — Node adapter, Docker container. Public docs rendering and caching.
  2. **Hono API** — Node, Docker container. REST API, MCP server, Orama search, better-auth, publish orchestration.
  3. **Admin SPA** — Static files, served by Nginx/Caddy or Traefik directly.
- **Internal networking:** Astro and Hono containers communicate over Docker's internal network. The cache invalidation endpoint on Astro is not exposed publicly.
- **CI:** TBD — likely Gitea Actions or similar self-hosted CI for building and deploying all three apps.
- **Cloudflare (optional):** Can be added later in front of the docs site for edge caching. The Astro route caching works independently of this.

---

## Key Architectural Risks & Mitigations

1. **Whitespace fidelity:** Every layer in the pipeline can mangle whitespace (ProseMirror schema, serializer, HTML rendering, CSS). End-to-end character-level tests are mandatory. Build these first.
2. **Astro route caching is experimental (as of Astro 6).** The API may change. Acceptable risk for a project not launching immediately — track the RFC.
3. **Memory cache is per-process.** Both the Astro route cache and the Orama search index are in-memory. Server restarts mean a cold cache and a search index rebuild from Postgres. Acceptable for single-instance self-hosted deployment — the Orama rebuild for ~2,000 pages takes seconds.
4. **Content migration:** 1,500+ pages from existing formats (Word, PDF, legacy) into ProseMirror JSON is a significant effort — likely 30-40% of total project work. Plan for a bulk import pipeline with manual review of braille blocks.
5. **Search indexing of braille content:** Raw ASCII braille is excluded from the Orama index. Only prose, titles, descriptions, and captions are indexed.
6. **Cross-reference invalidation:** If a page is linked from many other pages, updating it may require invalidating multiple cached paths. The `document_links` table tracks this. Evaluate whether stale-while-revalidate is sufficient or if a dependency graph is needed.

---

## Decisions Still To Be Made

- [ ] ORM / query layer: Drizzle vs. Kysely vs. other.
- [ ] Content migration pipeline: source formats, tooling, validation.
- [ ] CI/CD pipeline: Gitea Actions, Forgejo, or other.
- [ ] Monitoring and observability.

### Decisions Made

- [x] **Database provider:** Postgres on Neon.
- [x] **API architecture:** Standalone Hono service. REST API + MCP server in one process.
- [x] **Search implementation:** Orama, in-memory in the Hono process.
- [x] **Auth provider:** better-auth only (no Logto). API key plugin for MCP access.
- [x] **MCP server:** Integrated into the Hono service via Streamable HTTP transport.