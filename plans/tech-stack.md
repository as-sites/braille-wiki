# Tech Stack

Everything needed to build and run the Braille Documentation Platform across its three services (public docs site, backend API + MCP server, admin dashboard) and shared infrastructure.

---

## Shared / Cross-Cutting

These live in internal workspace packages (see Monorepo Structure below) and are imported by multiple apps.

| Package | Purpose |
|---|---|
| `zod` | Schema validation. Used by Hono's validator, Drizzle's schema helpers, the MCP SDK (peer dependency), and shared input validation. Lives in `packages/db` and `packages/shared`. |
| `drizzle-orm` | ORM / query builder. Type-safe, lightweight, SQL-like syntax. First-class Neon Postgres support. Chosen over Kysely for its migration tooling (Drizzle Kit) and broader ecosystem. Lives in `packages/db`. |
| `drizzle-kit` | CLI companion for Drizzle. Generates and runs migrations, provides `drizzle-kit push` for rapid dev iteration, and includes Drizzle Studio for visual DB browsing. Dev dependency in `packages/db`. |
| `@neondatabase/serverless` | Neon's Postgres driver. Used by Drizzle to connect to Neon over HTTP or WebSockets. Lives in `packages/db`. |
| `drizzle-zod` | Generates Zod schemas from Drizzle table definitions. Keeps API validation and DB schema in sync without manual duplication. Lives in `packages/db`. |

---

## 1. Public Documentation Site — Astro + Starlight

| Package | Purpose |
|---|---|
| `astro` | Core framework (v6+). Handles SSR page rendering with the Node adapter. Uses experimental route caching (`experimental.cache`) for per-page caching with tag-based invalidation. |
| `@astrojs/starlight` | Documentation theme built on Astro. Provides the sidebar, navigation, breadcrumbs, search UI shell, and accessible page layout out of the box. |
| `@astrojs/node` | Astro adapter for running SSR on Node.js in a Docker container. |

Astro queries Postgres directly for page rendering by importing from the shared `@braille-docs/db` package — it does not call the Hono API for SSR. The only client-side JS on the public site is the search modal, which calls the Hono API's search endpoint.

---

## 2. Backend API + MCP Server — Hono

### Core Framework

| Package | Purpose |
|---|---|
| `hono` | HTTP framework. Handles all REST endpoints, middleware, route grouping. Provides RPC client (`hono/client`) for type-safe API consumption from the admin SPA. |
| `@hono/zod-validator` | Hono middleware for validating request bodies/params/queries against Zod schemas. |
| `@hono/node-server` | Adapter for running Hono on Node.js (as opposed to edge runtimes). |

### Authentication

| Package | Purpose |
|---|---|
| `better-auth` | Auth library. Manages email/password login, session cookies, user table, and role management (`admin` / `editor`). Mounted at `/api/auth/*` within Hono. |
| `@better-auth/api-key` | Better-auth plugin for API key generation, validation, and management. Powers MCP server authentication and external integrations via `x-api-key` header. |

### MCP Server

| Package | Purpose |
|---|---|
| `@modelcontextprotocol/sdk` | Official MCP TypeScript SDK. Provides `McpServer`, tool/resource/prompt registration, and Streamable HTTP transport. Peer-depends on `zod`. |
| `@modelcontextprotocol/hono` | Hono middleware adapter for the MCP SDK. Handles JSON body parsing, Host header validation, and wiring the MCP transport into Hono's route handler at `/mcp`. |

### Search

| Package | Purpose |
|---|---|
| `@orama/orama` | Full-text search engine. Runs in-memory in the Hono process. Indexed from Postgres on startup, updated incrementally at publish/unpublish time. |

### ProseMirror Serialization

At publish time, the Hono service serializes ProseMirror JSON → HTML. Rather than owning these dependencies directly, it imports from the shared `@braille-docs/editor-schema` package (see Monorepo Structure below), which ensures the server-side serializer and the client-side editor use the exact same Tiptap schema and extension definitions.

### Media Storage

| Package | Purpose |
|---|---|
| `@aws-sdk/client-s3` | AWS S3 SDK. Cloudflare R2 is S3-compatible, so this handles all media upload/download/delete operations against R2. |
| `@aws-sdk/s3-request-presigner` | Generates presigned URLs for direct client uploads to R2 (optional optimization — can also proxy uploads through Hono). |

---

## 3. Admin Dashboard — Vite + React SPA

### Build & Routing

| Package | Purpose |
|---|---|
| `vite` | Build tool and dev server for the React SPA. |
| `react` | UI library. |
| `react-dom` | React DOM renderer. |
| `react-router` | Client-side routing. Handles `/login`, `/documents`, `/documents/:id/edit`, `/media`, `/settings`, etc. |

### Editor

The editor uses **Tiptap's Simple Editor template** (`npx @tiptap/cli@latest init simple-editor`), which scaffolds a working editor with toolbar components, node components, and primitives — all MIT-licensed and customizable. The Tiptap schema and extension configuration (including the custom BrailleBlock node) are defined in the shared `@braille-docs/editor-schema` package so the admin editor and the server-side serializer stay in sync.

| Package | Purpose |
|---|---|
| `@tiptap/react` | React bindings for Tiptap. Provides the `useEditor` hook and `EditorContent` component. |
| `@tiptap/core` | Core editor engine. |
| `@tiptap/pm` | ProseMirror dependencies (model, state, view, transform, etc.) bundled by Tiptap. |
| `@tiptap/starter-kit` | Bundle of common extensions: Bold, Italic, Strike, Code, Heading, BulletList, OrderedList, Blockquote, HorizontalRule, History, etc. |
| `@tiptap/extension-underline` | Underline formatting. Not included in starter-kit. |
| `@tiptap/extension-text-align` | Text alignment (left, center, right, justify). |
| `@tiptap/extension-link` | Link editing with paste-detection and auto-linking. |
| `@tiptap/extension-image` | Image node support. |
| `@tiptap/extension-code-block` | Code block extension. The custom BrailleBlock node extends this. |
| `@tiptap/extension-placeholder` | Placeholder text for empty editor states. |
| `@tiptap/cli` | CLI tool for adding/scaffolding Tiptap UI components. Dev dependency only. |
| `sass-embedded` | SCSS compiler. Required by Tiptap UI Components for their styling (variables, keyframe animations). Installed automatically by the Tiptap CLI. |

The Tiptap CLI scaffolds UI components (toolbar buttons, dropdowns, popovers, node renderers) and primitives (Button, Popover, DropdownMenu, Toolbar, etc.) directly into your `src/components/` directory. These are **not npm dependencies** — they're source files you own and customize. This is similar to how shadcn/ui works but specific to Tiptap.

### Admin UI Components (non-editor pages)

For the admin pages outside the editor (document browser, media library, settings, login form), the Tiptap primitives (Button, Input, Label, Card, Popover, DropdownMenu, Separator, etc.) that come with the Simple Editor template can be reused. They are generic React components, not editor-specific, and cover the basics needed for forms, dialogs, and navigation.

If you find gaps (e.g. need a data table, toast notifications, dialog/modal, tabs), you can add individual components from **shadcn/ui** on an as-needed basis — it uses the same copy-into-repo model and pairs well since both use Radix UI primitives internally. This avoids pulling in a full component library upfront.

| Package | Purpose |
|---|---|
| `@radix-ui/*` | Headless UI primitives (already a dependency of Tiptap's primitives). Individual packages like `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, etc. added as needed via shadcn/ui CLI. |
| `tailwindcss` | Utility-first CSS. Optional but recommended if you add shadcn/ui components, since they're styled with Tailwind. Also useful for the non-editor admin pages. |

### API Client

| Package | Purpose |
|---|---|
| `hono` | Imported client-side for `hono/client` only — the RPC client that provides end-to-end type safety between the Hono API and the React SPA. No server code is bundled; Vite tree-shakes to just the client module. |

---

## Infrastructure & Deployment

| Tool | Purpose |
|---|---|
| **Docker** | Each service runs in its own container: Astro (Node), Hono (Node), Admin SPA (static files served by the Hono container or a lightweight server). |
| **Traefik** | Reverse proxy. Routes traffic to the correct container based on hostname/path. Handles TLS termination. Can also add basic auth middleware for admin routes as an extra layer. |
| **Postgres (Neon)** | Managed serverless Postgres. All document content, revisions, media metadata, user/session data. |
| **Cloudflare R2** | S3-compatible object storage for uploaded media (images, PDFs). Accessed via the AWS S3 SDK. |

---

## Monorepo Structure

### Tooling

| Tool | Purpose |
|---|---|
| `pnpm` | Package manager. Native workspace support via `pnpm-workspace.yaml`. Strict dependency isolation (no phantom deps), fast installs via content-addressable store, and disk-efficient linking. |
| `nx` | Task runner on top of pnpm workspaces. Orchestrates `build`, `dev`, `typecheck`, etc. across packages with dependency-aware parallelism and local caching. In package-based mode, Nx infers the project graph from `package.json` files automatically — no `project.json` per package, no generators or executors needed. Just an `nx.json` at the root. |

Nx is used in **package-based** mode (as opposed to "integrated" mode), which means it reads the project graph from pnpm workspace `package.json` files and requires no per-project configuration files. This keeps it lightweight — comparable in setup complexity to Turborepo, but with better built-in tooling (dependency graph visualization via `nx graph`, affected-only commands via `nx affected`, and fine-grained caching).

### Directory Layout

```
braille-docs/
├── apps/
│   ├── web/                  # Public docs site — Astro + Starlight
│   ├── api/                  # Backend API + MCP server — Hono
│   └── admin/                # Admin dashboard — Vite + React SPA
│
├── packages/
│   ├── db/                   # Shared database layer
│   ├── shared/               # Shared types, constants, utilities
│   └── editor-schema/        # Shared Tiptap/ProseMirror schema
│
├── pnpm-workspace.yaml
├── nx.json
├── package.json              # Root — devDependencies only (nx, typescript)
├── docker-compose.yml
└── .env
```

### Internal Packages

These are workspace packages (never published to npm) that multiple apps import. Each has its own `package.json` with a `name` like `@braille-docs/db` and is referenced by apps via pnpm workspace protocol (`"@braille-docs/db": "workspace:*"`).

#### `packages/db`

The single source of truth for all database access. Both the Astro app and the Hono API import from this package — no duplicated queries, no schema drift.

Contains: Drizzle schema definitions (all tables), the Drizzle client/connection setup, pre-built query functions (e.g. `getPublishedDocument(path)`, `getSidebarTree(rootPath)`, `getDocumentById(id)`), migration files, and `drizzle.config.ts`.

Key dependencies: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-zod`, `zod`.

#### `packages/editor-schema`

The Tiptap/ProseMirror schema shared between the admin editor (client-side) and the Hono API (server-side serialization). This is the package that ensures the editor and the publish-time HTML serializer use the exact same node definitions — especially critical for the custom BrailleBlock node.

Contains: All Tiptap extension configurations (starter kit setup, BrailleBlock custom node, link, image, code block, etc.), the ProseMirror schema derived from those extensions, and the HTML serialization function used at publish time.

Key dependencies: `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-code-block`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/html`.

#### `packages/shared`

Lightweight utilities and type definitions shared across all three apps. Intentionally kept thin — this is for things that genuinely belong nowhere else.

Contains: TypeScript types derived from the Drizzle schema (e.g. `Document`, `Media`, `DocumentRevision`), shared constants (status enums, role enums, path utilities), and any helper functions used by multiple apps (e.g. path manipulation for the document hierarchy).

Key dependencies: `zod` (for shared validation schemas that aren't database-specific).

### How Apps Reference Internal Packages

Each app's `package.json` lists internal packages as dependencies using the workspace protocol:

```jsonc
// apps/api/package.json
{
  "dependencies": {
    "@braille-docs/db": "workspace:*",
    "@braille-docs/editor-schema": "workspace:*",
    "@braille-docs/shared": "workspace:*",
    "hono": "...",
    // ...
  }
}
```

```jsonc
// apps/web/package.json
{
  "dependencies": {
    "@braille-docs/db": "workspace:*",
    "@braille-docs/shared": "workspace:*",
    "astro": "...",
    // ...
  }
}
```

```jsonc
// apps/admin/package.json
{
  "dependencies": {
    "@braille-docs/editor-schema": "workspace:*",
    "@braille-docs/shared": "workspace:*",
    "react": "...",
    "hono": "...",
    // ...
  }
}
```

Note that `apps/admin` does not depend on `@braille-docs/db` — the admin SPA never talks to Postgres directly. It goes through the Hono API.

### Nx Configuration

```jsonc
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "dev": {
      "cache": false
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

Nx infers projects and their dependencies from the pnpm workspace. Running `nx run-many -t dev` starts all three apps in parallel. Running `nx run-many -t build` builds internal packages first (respecting the dependency graph), then the apps. `nx affected -t build` only rebuilds what changed since the last commit — useful in CI.

---

## Summary by Service

```
apps/web (Astro)             apps/api (Hono)                 apps/admin (Vite + React)
─────────────────────        ──────────────────────────      ──────────────────────────
astro                        hono                            vite
@astrojs/starlight           @hono/zod-validator             react / react-dom
@astrojs/node                @hono/node-server               react-router
                             better-auth                     @tiptap/react
                             @better-auth/api-key            @tiptap/core + extensions
                             @modelcontextprotocol/sdk       @tiptap/pm
                             @modelcontextprotocol/hono      @tiptap/starter-kit
                             @orama/orama                    @tiptap/cli (dev)
                             @aws-sdk/client-s3              sass-embedded
                             @aws-sdk/s3-request-presigner   hono (client-side RPC only)
                                                             tailwindcss (optional)
                                                             @radix-ui/* (as needed)

packages/db                  packages/editor-schema          packages/shared
─────────────────────        ──────────────────────────      ──────────────────────────
drizzle-orm                  @tiptap/core                    zod
drizzle-kit (dev)            @tiptap/pm
@neondatabase/serverless     @tiptap/starter-kit
drizzle-zod                  @tiptap/html
zod                          @tiptap/extension-*

── Root ────────────────────────────────────────────────────────────────────────
pnpm (package manager) + nx (task runner) + typescript
```

---

## Notes

**Why Drizzle over Kysely:** Drizzle has first-class Neon support (dedicated `drizzle-orm/neon-http` and `drizzle-orm/neon-serverless` drivers), a built-in migration CLI (`drizzle-kit`), Drizzle Studio for visual DB browsing during development, and `drizzle-zod` for generating validation schemas from table definitions. Kysely is excellent but requires more manual wiring for migrations and doesn't have an equivalent schema-to-validator pipeline.

**Tiptap Simple Editor vs. building from scratch:** The Simple Editor template gives you a working editor with a toolbar, image upload, link editing, code blocks, lists, headings, and undo/redo — all MIT-licensed source files scaffolded into your project. You'll extend this with the custom BrailleBlock node. Building equivalent UI from raw ProseMirror would be weeks of work.

**React 18 note:** Tiptap's UI Components currently work best with React 18. Their React 19 support is in progress. Pin to React 18 at project start and upgrade when Tiptap confirms compatibility.