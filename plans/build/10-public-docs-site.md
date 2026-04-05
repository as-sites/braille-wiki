# 10 — Public Documentation Site

## Scope

Build the public-facing documentation site using Astro + Starlight. The site renders pre-built HTML from Postgres, implements route caching with tag-based invalidation, provides an internal cache invalidation endpoint, and includes a search modal that calls the Hono API.

## Prerequisites

- **02 — Database Package** (Astro queries Postgres directly for SSR)
- **03 — Shared Packages** (types, path utilities)
- **08 — Publish Flow** (must have published documents with `rendered_html` to display)

## Unblocks

- 14 (Infrastructure — needs the Astro app to containerize)

## Reference Docs

- `plans/project-instructions.md` — "1. Public Documentation Site — Astro + Starlight" section, "BrailleBlock — Public Site Rendering"
- `plans/routes.md` — "1. Public Docs" section
- `plans/tech-stack.md` — "1. Public Documentation Site" section

## Packages to Install

In `apps/web/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `astro` | dependency | Core framework (v6+) |
| `@astrojs/starlight` | dependency | Documentation theme |
| `@astrojs/node` | dependency | Node.js SSR adapter |

Also add workspace dependencies:
- `@braille-docs/db: "workspace:*"`
- `@braille-docs/shared: "workspace:*"`

## Deliverables

```
apps/web/
├── astro.config.mjs              # Astro configuration (Starlight, Node adapter, caching)
├── src/
│   ├── content/
│   │   └── config.ts             # Content collection config (if using Astro content layer)
│   ├── pages/
│   │   ├── index.astro           # Landing page — lists root-level works
│   │   ├── [...path].astro       # Catch-all doc page
│   │   └── internal/
│   │       └── cache-invalidate.ts  # POST /internal/cache/invalidate endpoint
│   ├── components/
│   │   ├── SearchModal.astro     # Search overlay (client-side JS calls Hono API)
│   │   ├── Sidebar.astro         # Sidebar tree navigation
│   │   ├── Breadcrumbs.astro     # Breadcrumb navigation
│   │   └── BrailleBlock.astro    # Styling wrapper for braille blocks in rendered HTML
│   ├── layouts/
│   │   └── DocLayout.astro       # Page layout extending Starlight's layout
│   ├── lib/
│   │   ├── db.ts                 # Database queries for SSR (imports from @braille-docs/db)
│   │   └── tree.ts               # Build nested tree structure from flat DB results
│   └── styles/
│       └── braille-block.css     # BrailleBlock public rendering styles
├── public/                       # Static assets
├── package.json
└── tsconfig.json
```

## Requirements

### Astro Configuration (`astro.config.mjs`)

- **Output mode:** `'server'` (SSR with Node adapter)
- **Adapter:** `@astrojs/node` with `mode: 'standalone'`
- **Integrations:** `starlight()` with custom sidebar config
- **Experimental cache:** Enable `experimental.cache` for route caching
  - Default cache: `maxAge` of 1 hour, `swr` (stale-while-revalidate) of 1 day
  - Use `memoryCache` provider (acceptable for single-instance deployment)

### Landing Page (`src/pages/index.astro`)

- Query `getRootWorks()` from `@braille-docs/db` to get all published root-level documents
- Render a card/list for each work showing title, description
- Each card links to `/<path>` (e.g., `/nemeth`)
- Cache tag: `doc:index`

### Catch-All Doc Page (`src/pages/[...path].astro`)

- Extract `path` from Astro params
- Query `getPublishedDocument(path)` — return 404 if not found
- Query `getSidebarTree(rootPath)` for the sidebar — `rootPath` is the first segment of the path
- Query `getBreadcrumbs(path)` for breadcrumbs
- Render:
  - Sidebar tree (left panel, via Starlight's sidebar slot or custom component)
  - Breadcrumbs (above content)
  - `rendered_html` as the main content (use `set:html` directive)
  - Previous/next navigation links (derived from sidebar tree + position)
- Cache tag: `doc:<path>`

### Cache Invalidation Endpoint (`src/pages/internal/cache-invalidate.ts`)

- `POST /internal/cache/invalidate`
- Validate `x-internal-secret` header against `INTERNAL_SECRET` env var — return 401 if invalid
- Body: `{ tags: string[] }`
- Call Astro's cache invalidation API to purge the specified tags
- Return 200 on success
- This endpoint must NOT be exposed publicly — only accessible on the internal Docker network

### Sidebar Component (`src/components/Sidebar.astro`)

- Receives the flat tree data from the page
- Build nested tree structure using `buildTree()` from `src/lib/tree.ts`
- Render as a nested `<nav>` with `<ul>/<li>` structure
- Highlight the current page
- Collapsible sections for deep hierarchies
- Accessible: proper ARIA attributes (`aria-current`, `aria-expanded`)

### Breadcrumbs Component (`src/components/Breadcrumbs.astro`)

- Receives ancestor documents array
- Render as `<nav aria-label="Breadcrumb">` with `<ol>` of links
- Last item (current page) is not a link

### Search Modal (`src/components/SearchModal.astro`)

- Client-side JavaScript (this is the only JS on the public site)
- Activated by a search button in the header or keyboard shortcut (Ctrl+K / Cmd+K)
- Calls `GET /api/search?q=...` on the Hono API
- Displays results with title, path, and snippet
- Clicking a result navigates to the page
- Debounce input (300ms)
- Show loading state while searching
- API URL from env var: `PUBLIC_API_URL`

### BrailleBlock CSS (`src/styles/braille-block.css`)

Critical styles for correct braille rendering on the public site:

```css
/* Target the BrailleBlock elements in rendered HTML */
pre[data-braille-block] {
  /* Exact whitespace preservation */
  white-space: pre;

  /* Monospace font — no substitution, no fallback to proportional */
  font-family: 'Courier New', Courier, monospace;

  /* No line wrapping — horizontal scroll if needed */
  overflow-x: auto;
  overflow-y: hidden;

  /* Visual distinction */
  background-color: /* subtle background */;
  border: 1px solid /* border color */;
  border-radius: 4px;
  padding: 1rem;
  margin: 1.5rem 0;

  /* Prevent any text reformatting */
  text-transform: none;
  letter-spacing: normal;
  word-spacing: normal;
  tab-size: 8;

  /* No font size adjustment on mobile */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

pre[data-braille-block] code {
  /* Inherit monospace, no additional styling */
  font-family: inherit;
  background: none;
  padding: 0;
  white-space: inherit;
}
```

### Accessibility

Screen reader accessibility is a **top priority** for the public site:

- All pages have proper heading hierarchy (`h1` for title, `h2`-`h6` for content)
- Sidebar navigation uses `<nav aria-label="Documentation">` with proper tree semantics
- Breadcrumbs use `<nav aria-label="Breadcrumb">`
- BrailleBlock elements need ARIA treatment:
  - `role="img"` with `aria-label` containing the caption (if provided)
  - OR a visually-hidden text alternative describing the braille content
  - The `data-braille-type` attribute should be exposed as part of the label (e.g., "Braille translation example, UEB Grade 2: [caption]")
- Skip navigation link at top of page
- Focus management: search modal traps focus while open
- Color contrast: meet WCAG 2.1 AA minimum (4.5:1 for text)
- All interactive elements keyboard-accessible

### Database Queries (`src/lib/db.ts`)

Import and re-export the relevant query functions from `@braille-docs/db`:
- `getPublishedDocument(path)`
- `getSidebarTree(rootPath)`
- `getBreadcrumbs(path)`
- `getRootWorks()`
- `getChildren(parentPath, depth)`

These queries run during SSR. The Astro app connects to Postgres directly — it does NOT call the Hono API for page rendering.

## Verification

1. `pnpm --filter @braille-docs/web dev` starts the Astro dev server
2. Navigate to `/` — landing page shows published root-level works
3. Navigate to a document path (e.g., `/nemeth/chapter-1`) — page renders with sidebar, breadcrumbs, and content
4. BrailleBlock content renders in monospace with exact whitespace preservation
5. Search modal: type a query, see results from the Hono API, click to navigate
6. 404 page renders for non-existent or non-published paths
7. Accessibility audit (Lighthouse, axe): no critical violations
8. Screen reader test: page is navigable and BrailleBlock content is properly announced
9. Cache invalidation: publish a document, call the invalidation endpoint, verify the cache is purged and the next request shows updated content

## Notes

- Astro experimental route caching API may change. Track the Astro RFC. The implementation should be straightforward to update.
- The `memoryCache` provider is acceptable for single-instance deployment. If horizontal scaling is ever needed, switch to a Redis-backed cache.
- Starlight provides a lot of documentation UI out of the box (sidebar, navigation, breadcrumbs, search UI shell). Customize rather than replace where possible.
- The search modal is the ONLY client-side JavaScript on the public site. Keep it minimal.
- BrailleBlock ARIA: the `role="img"` approach works well because the visual layout IS the content — it's not decorative, it's informational but in a spatial format that can't be linearized. The caption provides the screen reader alternative.
