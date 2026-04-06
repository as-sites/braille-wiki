# 07 — Editor & BrailleBlock

## Scope

Set up the admin SPA (Vite + React), scaffold the Tiptap editor using the Simple Editor template, implement the BrailleBlock custom NodeView for the editor UI, wire up the editor page to load/save documents via the API, and set up the generated OpenAPI client.

## Prerequisites

- **03 — Shared Packages** (editor schema with BrailleBlock node definition)
- **04 — OpenAPI Spec** (for client generation)
- **05 — Auth** (session auth for API calls)
- **06 — API Core** (document CRUD endpoints)

## Unblocks

- 08 (Publish Flow — editor is complete, publish button can be wired)

## Reference Docs

- `plans/tech-stack.md` — "3. Admin Dashboard" section, "Editor" subsection, "Admin UI Components" section
- `plans/project-instructions.md` — "Editor: Tiptap" section, "The Critical Custom Node: BrailleBlock" section
- `plans/routes.md` — "3. Admin UI" routes (specifically `/documents/:id/edit`)

## Packages to Install

In `apps/admin/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `vite` | devDependency | Build tool and dev server |
| `react` | dependency | UI library (pin to React 18 — see notes) |
| `react-dom` | dependency | React DOM renderer |
| `react-router` | dependency | Client-side routing |
| `@tiptap/react` | dependency | React bindings for Tiptap (`useEditor`, `EditorContent`) |
| `@tiptap/core` | dependency | Core editor engine |
| `@tiptap/pm` | dependency | ProseMirror dependencies |
| `@tiptap/starter-kit` | dependency | Common extensions bundle |
| `@tiptap/extension-underline` | dependency | Underline formatting |
| `@tiptap/extension-text-align` | dependency | Text alignment |
| `@tiptap/extension-link` | dependency | Link editing |
| `@tiptap/extension-image` | dependency | Image nodes |
| `@tiptap/extension-code-block` | dependency | Base for BrailleBlock |
| `@tiptap/extension-placeholder` | dependency | Placeholder text |
| `@tiptap/cli` | devDependency | CLI for scaffolding Tiptap UI components |
| `sass-embedded` | devDependency | SCSS compiler for Tiptap UI Components |
| `openapi-typescript` | devDependency | Generate TypeScript types from OpenAPI spec |
| `openapi-fetch` | dependency | Type-safe API client from OpenAPI spec |
| `@vitejs/plugin-react` | devDependency | Vite React plugin |

Also add workspace dependencies:
- `@braille-wiki/editor-schema: "workspace:*"`
- `@braille-wiki/shared: "workspace:*"`

## Deliverables

```
apps/admin/
├── index.html                    # SPA entry point
├── vite.config.ts                # Vite configuration
├── src/
│   ├── main.tsx                  # React entry — mounts App
│   ├── App.tsx                   # Router setup with all routes
│   ├── api/
│   │   ├── client.ts             # openapi-fetch client instance
│   │   └── generated/            # Generated types from OpenAPI spec (gitignored or committed)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── Editor.tsx        # Main editor component wrapping Tiptap
│   │   │   ├── Toolbar.tsx       # Editor toolbar (scaffolded by Tiptap CLI, customized)
│   │   │   └── BrailleBlockView.tsx  # Custom NodeView for BrailleBlock
│   │   └── layout/
│   │       └── AdminLayout.tsx   # Shared layout (sidebar, header) — stub for now
│   ├── pages/
│   │   ├── LoginPage.tsx         # Stub (implemented in plan 13)
│   │   ├── DocumentEditPage.tsx  # Editor page — the focus of this plan
│   │   └── ...                   # Other page stubs (plan 13)
│   ├── hooks/
│   │   └── useAuth.ts            # Auth state hook (session check)
│   └── styles/
│       └── braille-block.scss    # BrailleBlock editor styles
├── package.json
└── tsconfig.json
```

## Requirements

### Vite Configuration (`vite.config.ts`)

- React plugin
- Proxy `/api` requests to the Hono API server in development (avoid CORS issues)
- Alias `@braille-wiki/editor-schema` and `@braille-wiki/shared` to workspace packages

### React Router (`src/App.tsx`)

Set up all routes from `plans/routes.md` section 3. Most pages are stubs at this stage — the editor page is the focus:

- `/login` → `LoginPage` (stub)
- `/` → Dashboard (stub)
- `/documents` → Document browser (stub)
- `/documents/new` → Create document (stub)
- `/documents/:id/edit` → `DocumentEditPage` (implemented here)
- `/documents/:id/preview` → Preview (stub)
- `/documents/:id/history` → History (stub)
- `/media` → Media library (stub)
- `/settings` → Settings (stub)

### OpenAPI Client (`src/api/client.ts`)

1. Generate TypeScript types: `npx openapi-typescript ../packages/shared/openapi.yaml -o src/api/generated/api.ts`
2. Create the `openapi-fetch` client instance:
   - Base URL from environment variable (`VITE_API_URL`)
   - Credentials: `'include'` (for session cookies)
3. Export typed helper functions that wrap common API calls:
   - `getDocument(id)` → `GET /api/admin/documents/{id}`
   - `saveDocument(id, data)` → `PUT /api/admin/documents/{id}`
   - `publishDocument(id)` → `POST /api/admin/documents/{id}/publish`
   - etc.

Add a script to `package.json`: `"generate:api": "openapi-typescript ../../packages/shared/openapi.yaml -o src/api/generated/api.ts"`

### Tiptap Editor Setup

#### Scaffold (`npx @tiptap/cli init simple-editor`)

Run the Tiptap CLI to scaffold the Simple Editor template. This generates:
- Toolbar components (bold, italic, headings, lists, etc.)
- Primitive UI components (Button, Popover, DropdownMenu, etc.)
- Editor styling

These are source files placed in `src/components/` — customize them freely.

#### Editor Component (`src/components/editor/Editor.tsx`)

- Use `useEditor()` hook from `@tiptap/react`
- Pass extensions from `@braille-wiki/editor-schema` via `getExtensions()`
- Add the BrailleBlock NodeView registration (see below)
- Load initial content from the API when the page mounts
- Provide save handler that serializes editor state to JSON and calls `PUT /api/admin/documents/:id`

#### BrailleBlock NodeView (`src/components/editor/BrailleBlockView.tsx`)

This is the editor-side visual representation of the BrailleBlock node. It's a React NodeView:

- **Display:** A visually distinct container (shaded background, border, labeled header saying "Braille Example")
- **Content area:** Monospace font (`font-family: monospace`), `white-space: pre`, no wrapping
- **Header:** Shows the `brailleType` attribute (e.g., "UEB Grade 2") and optional `caption`
- **Editable attributes:** Dropdown to change `brailleType`, text input for `caption` — rendered in the NodeView header
- **Content editing:** The inner text area is a ProseMirror contentEditable region. Because the node has `code: true` and `preserveWhitespace: 'full'`, whitespace is preserved automatically by ProseMirror.
- **Toolbar integration:** Add a toolbar button to insert a new BrailleBlock at the cursor position

Register the NodeView with Tiptap's `addNodeView()` method on the BrailleBlock extension (extend it in the admin app, don't modify the shared schema package).

### Document Edit Page (`src/pages/DocumentEditPage.tsx`)

- **URL:** `/documents/:id/edit`
- **On mount:** Fetch document via `GET /api/admin/documents/:id`. Load `prosemirror_json` into the editor.
- **Save button:** Serialize editor state to ProseMirror JSON, call `PUT /api/admin/documents/:id`
- **Publish button:** Call `POST /api/admin/documents/:id/publish` (uses the stub from plan 06 until plan 08 implements it)
- **Status display:** Show current document status, last save time, last publish time
- **Metadata panel:** Side panel or modal for editing title, description, metadata JSONB
- **Unsaved changes warning:** Track dirty state, warn before navigating away

### Auth Hook (`src/hooks/useAuth.ts`)

- On app load, check session via better-auth client
- If no session, redirect to `/login`
- Expose `user` object (id, name, email, role) and `logout()` function

## Verification

1. `pnpm --filter @braille-wiki/admin dev` starts the Vite dev server
2. Navigate to `/documents/:id/edit` with a valid document ID
3. Editor loads and displays the document content
4. Type text, apply formatting (bold, italic, headings, lists) — verify they work
5. Insert a BrailleBlock — verify it appears with the distinct visual container
6. Type multiline braille content inside the BrailleBlock — verify whitespace is preserved exactly
7. Change brailleType and caption attributes — verify they update in the NodeView
8. Click Save — verify the API receives the ProseMirror JSON and the document is updated in the database
9. Reload the page — verify the content loads correctly from the API
10. BrailleBlock content survives the save/load round-trip with exact whitespace fidelity

## Notes

- **Pin React to version 18.** Tiptap's UI Components have known issues with React 19. Upgrade when Tiptap confirms compatibility.
- The BrailleBlock NodeView is client-only code — it's not part of `packages/editor-schema`. The shared package defines the ProseMirror node spec; this plan adds the React rendering.
- The Tiptap CLI scaffolds SCSS-based components. `sass-embedded` is required for compilation.
- The `openapi-fetch` client provides type safety at zero runtime cost — it's a thin wrapper around `fetch()`.
- Stub pages (login, dashboard, document browser, etc.) just need a basic component that renders a heading. They're implemented in plan 13.
- The Vite proxy in dev mode avoids CORS issues. In production, all requests go through Traefik (plan 14).
