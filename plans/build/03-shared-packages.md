# 03 — Shared Packages

## Scope

Implement two shared workspace packages:

1. **`packages/shared`** — TypeScript types, constants, enums, and utility functions used across all three apps.
2. **`packages/editor-schema`** — The Tiptap/ProseMirror schema shared between the admin editor (client-side) and the Hono API (server-side serialization). Includes the critical BrailleBlock custom node definition.

## Prerequisites

- **01 — Monorepo Scaffolding** (workspace structure)
- **02 — Database Package** (types derived from Drizzle schema)

## Unblocks

- 04 (OpenAPI Spec — shared types and enums)
- 06 (API Core — needs editor schema for serialization)
- 07 (Editor + BrailleBlock — needs editor schema for Tiptap setup)
- 08 (Publish Flow — needs HTML serializer)
- 10 (Public Docs Site — needs shared types)
- 13 (Admin UI Shell — needs shared types and enums)

## Reference Docs

- `plans/tech-stack.md` — "Internal Packages" section (packages/shared, packages/editor-schema)
- `plans/project-instructions.md` — "The Critical Custom Node: BrailleBlock" section, "Editor: Tiptap" section

## Packages to Install

### `packages/shared`

| Package | Type | Purpose |
|---------|------|---------|
| `zod` | dependency | Shared validation schemas not tied to the database |

### `packages/editor-schema`

| Package | Type | Purpose |
|---------|------|---------|
| `@tiptap/core` | dependency | Core editor engine |
| `@tiptap/pm` | dependency | ProseMirror dependencies (model, state, view, transform) |
| `@tiptap/starter-kit` | dependency | Bundle of common extensions |
| `@tiptap/extension-underline` | dependency | Underline formatting |
| `@tiptap/extension-text-align` | dependency | Text alignment |
| `@tiptap/extension-link` | dependency | Link editing |
| `@tiptap/extension-image` | dependency | Image nodes |
| `@tiptap/extension-code-block` | dependency | Base for BrailleBlock |
| `@tiptap/extension-placeholder` | dependency | Placeholder text |
| `@tiptap/html` | dependency | HTML serialization/deserialization |

Also add workspace dependency:
- `@braille-wiki/shared: "workspace:*"` — for shared types

## Deliverables

### `packages/shared`

```
packages/shared/
├── src/
│   ├── index.ts                  # Public API — re-exports everything
│   ├── types/
│   │   ├── index.ts
│   │   ├── document.ts           # Document, DocumentRevision, DocumentLink types
│   │   └── media.ts              # Media type
│   ├── constants/
│   │   ├── index.ts
│   │   ├── status.ts             # DocumentStatus enum/union
│   │   └── roles.ts              # UserRole enum/union
│   └── utils/
│       ├── index.ts
│       └── path.ts               # Path manipulation utilities
├── package.json
└── tsconfig.json
```

### `packages/editor-schema`

```
packages/editor-schema/
├── src/
│   ├── index.ts                  # Public API — re-exports schema, extensions, serializer
│   ├── extensions/
│   │   ├── index.ts              # All extensions bundled as array
│   │   └── braille-block.ts      # BrailleBlock custom node definition
│   ├── schema.ts                 # ProseMirror schema derived from extensions
│   └── serializer.ts             # ProseMirror JSON → HTML serialization function
├── package.json
└── tsconfig.json
```

## Requirements

### `packages/shared`

#### Types (`src/types/document.ts`)

Derive TypeScript types from the Drizzle schema in `packages/db`. Import the Drizzle `InferSelectModel` type:

- `Document` — Full document row type
- `DocumentRevision` — Full revision row type
- `DocumentLink` — Link row type (`{ source_path, target_path }`)
- `DocumentTreeNode` — Recursive type for sidebar trees: `{ path, title, position, children: DocumentTreeNode[] }`
- `DocumentBreadcrumb` — `{ path, title }`

#### Types (`src/types/media.ts`)

- `Media` — Full media row type

#### Constants (`src/constants/status.ts`)

- `DocumentStatus` — `'draft' | 'published' | 'archived'` as a TypeScript union type
- `DOCUMENT_STATUSES` — Array of all valid statuses (for iteration/validation)

#### Constants (`src/constants/roles.ts`)

- `UserRole` — `'admin' | 'editor'` as a TypeScript union type
- `USER_ROLES` — Array of all valid roles

#### Path Utilities (`src/utils/path.ts`)

- `getParentPath(path: string): string | null` — Returns parent path or null for root. E.g., `'nemeth/chapter-3/rule-7'` → `'nemeth/chapter-3'`.
- `getDepth(path: string): number` — Returns segment count. E.g., `'nemeth/chapter-3'` → `2`.
- `getSlug(path: string): string` — Returns last segment. E.g., `'nemeth/chapter-3'` → `'chapter-3'`.
- `getAncestorPaths(path: string): string[]` — Returns all ancestor paths. E.g., `'nemeth/chapter-3/rule-7'` → `['nemeth', 'nemeth/chapter-3']`.
- `isChildOf(childPath: string, parentPath: string): boolean` — Direct child check.
- `isDescendantOf(descendantPath: string, ancestorPath: string): boolean` — Any depth.
- `buildPath(parentPath: string | null, slug: string): string` — Concatenates parent + slug.

### `packages/editor-schema`

#### Extensions (`src/extensions/index.ts`)

Export a function `getExtensions()` that returns the configured Tiptap extension array:

- `StarterKit` (from `@tiptap/starter-kit`) — includes Bold, Italic, Strike, Code, Heading (levels 1-6), BulletList, OrderedList, Blockquote, HorizontalRule, History
- `Underline`
- `TextAlign` configured for `['left', 'center', 'right', 'justify']`
- `Link` with `openOnClick: false`, `autolink: true`
- `Image` — basic image node
- `Placeholder` with configurable placeholder text
- `BrailleBlock` — custom node (see below)

**Do NOT include `CodeBlock` from starter-kit** — it is replaced by `BrailleBlock`.

#### BrailleBlock Node (`src/extensions/braille-block.ts`)

This is the most critical piece. The BrailleBlock extends Tiptap's `CodeBlock` concept:

**ProseMirror schema properties:**
- `group: 'block'`
- `content: 'text*'`
- `code: true` — prevents inline formatting inside the block
- `preserveWhitespace: 'full'` — prevents any whitespace normalization
- `defining: true`

**Attributes:**
- `brailleType` — string, default `'UEB Grade 2'`. Valid values: `'UEB Grade 1'`, `'UEB Grade 2'`, `'Nemeth'`, `'other'`
- `caption` — string, optional. Descriptive text for the braille example.

**Parser rules:**
- Parse from `<pre data-braille-block>` elements

**Render rules (for schema-based rendering):**
- Render as `<pre data-braille-block data-braille-type="..." data-caption="..."><code>...</code></pre>`

#### ProseMirror Schema (`src/schema.ts`)

- Derive the ProseMirror schema from the extensions using `getSchema(getExtensions())`
- Export the schema for use by the server-side serializer

#### HTML Serializer (`src/serializer.ts`)

- Export `serializeToHtml(prosemirrorJson: object): string`
- Uses `@tiptap/html`'s `generateHTML()` with the extensions from `getExtensions()`
- This function is called at publish time by the Hono API
- BrailleBlock must serialize to:
  - A `<pre>` element with `data-braille-block` attribute
  - `data-braille-type` and `data-caption` attributes preserved
  - Inner text content **character-for-character** — no trimming, no newline normalization, no entity encoding of spaces
  - Wrap inner content in `<code>` element

## Verification

1. `pnpm --filter @braille-wiki/shared typecheck` passes
2. `pnpm --filter @braille-wiki/editor-schema typecheck` passes
3. `pnpm --filter @braille-wiki/shared build` produces importable output
4. `pnpm --filter @braille-wiki/editor-schema build` produces importable output
5. Path utilities: unit tests for all functions with edge cases (root paths, empty strings, deeply nested paths)
6. Editor schema: create a ProseMirror document JSON with a BrailleBlock containing multiline braille text with specific spacing → serialize to HTML → verify character-for-character fidelity
7. Round-trip test: `serializeToHtml()` preserves all whitespace in BrailleBlock nodes (this is the #1 architectural risk)

## Notes

- **Whitespace fidelity is the #1 risk.** The BrailleBlock serializer must emit raw text content with zero modifications. A single extra or missing space makes braille incorrect. Build tests for this before anything else.
- The `packages/editor-schema` package must be isomorphic — it runs both in the browser (admin SPA) and on Node (Hono API). No DOM dependencies in the core schema/serializer.
- `@tiptap/html` uses `@tiptap/core`'s `generateHTML()` which works server-side without a DOM. Verify this works in Node without jsdom.
- The BrailleBlock NodeView (visual editor component) is NOT part of this package — it lives in the admin SPA (plan 07). This package only defines the ProseMirror node spec and serialization.
- Pin Tiptap packages to the same version to avoid ProseMirror peer dependency conflicts.
