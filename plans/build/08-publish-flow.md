# 08 — Publish Flow

## Scope

Implement the complete publish/unpublish/discard workflow in the Hono API. This includes server-side ProseMirror JSON to HTML serialization, BrailleBlock whitespace fidelity, the publish orchestration pipeline (serialize → store → snapshot → rebuild links → update search index → invalidate cache), and end-to-end tests.

## Prerequisites

- **02 — Database Package** (document and link query functions)
- **03 — Shared Packages** (`packages/editor-schema` — HTML serializer)
- **06 — API Core** (Hono app, stub service functions to fill in)
- **09 — Search** (Orama index update functions — search must be implemented first or concurrently)

## Unblocks

- 10 (Public Docs Site — needs published `rendered_html` to display)

## Reference Docs

- `plans/project-instructions.md` — "Data Flow Summary" (steps 3-4), "Key Architectural Risks" (#1 whitespace fidelity)
- `plans/routes.md` — "2c. Publishing" endpoints
- `plans/database-schema.md` — `rendered_html`, `published_prosemirror_json`, `document_links` table

## Packages to Install

No new packages — uses `@braille-wiki/editor-schema` (already a workspace dep of `apps/api`) and Orama (installed in plan 09).

Testing packages (devDependencies in `apps/api`):

| Package | Type | Purpose |
|---------|------|---------|
| `vitest` | devDependency | Test runner |

## Deliverables

```
apps/api/
├── src/
│   ├── services/
│   │   └── publishing.ts         # Fill in stub from plan 06
│   └── lib/
│       └── link-parser.ts        # Extract internal links from ProseMirror JSON
├── tests/
│   ├── publishing.test.ts        # Publish flow integration tests
│   └── braille-fidelity.test.ts  # Character-level whitespace fidelity tests
```

## Requirements

### Publishing Service (`src/services/publishing.ts`)

Fill in the stub created in plan 06 with three functions:

#### `publishDocument(id: string, userId: string)`

Full orchestration pipeline:

1. **Load** the document by ID. Fail if not found.
2. **Serialize** `prosemirror_json` to HTML using `serializeToHtml()` from `@braille-wiki/editor-schema`.
3. **Store** results in the database:
   - Set `rendered_html` to the serialized HTML
   - Set `published_prosemirror_json` to a snapshot of the current `prosemirror_json`
   - Set `status` to `'published'`
   - Set `published_at` to now
   - Update `updated_at`
4. **Create revision** with `action: 'publish'`.
5. **Rebuild document links:**
   - Parse internal links from the ProseMirror JSON using `extractInternalLinks()` (see below)
   - Call `rebuildLinksForDocument(sourcePath, targetPaths)` from db package
   - Compute which target pages had their backlinks change (added/removed links)
6. **Update Orama search index** — call the incremental update function from search service (plan 09). Index title, description, and text content (excluding BrailleBlock content).
7. **Invalidate Astro cache** — call `POST /internal/cache/invalidate` on the Astro app with cache tags:
   - `doc:<path>` for the published page
   - `doc:<path>` for every page whose backlinks changed
   - `doc:index` if this is a root-level document

Return the updated document with `published_at`.

#### `unpublishDocument(id: string, userId: string)`

1. Load document. Fail if not found or not published.
2. Set `status` to `'draft'`.
3. Clear `rendered_html` (set to null).
4. Create revision with `action: 'save'` (recording the state before unpublish).
5. Remove from Orama index.
6. Invalidate Astro cache for `doc:<path>`.

#### `discardDraft(id: string, userId: string)`

1. Load document. Fail if `published_prosemirror_json` is null (never published — nothing to discard to).
2. Copy `published_prosemirror_json` back to `prosemirror_json`.
3. Create revision with `action: 'save'`.
4. Return the restored document.

### Link Parser (`src/lib/link-parser.ts`)

#### `extractInternalLinks(prosemirrorJson: object): string[]`

- Walk the ProseMirror JSON tree recursively
- Find all `link` marks with an `href` attribute
- Filter to internal links (relative paths or paths matching the site's domain)
- Extract the document path from each link
- Return deduplicated array of target paths

### Cache Invalidation

- Call `POST /internal/cache/invalidate` on the Astro app
- URL from env var: `ASTRO_INTERNAL_URL` (e.g., `http://web:4321` on Docker internal network)
- Send header: `x-internal-secret` with value from env var `INTERNAL_SECRET`
- Body: `{ tags: string[] }` — list of cache tags to invalidate
- If the Astro app is unreachable (e.g., not deployed yet), log a warning but don't fail the publish

### BrailleBlock Serialization Fidelity

The `serializeToHtml()` function from `packages/editor-schema` handles this, but the publish flow must verify:

- BrailleBlock text content is emitted **character-for-character**
- No trimming of leading/trailing whitespace or blank lines
- No newline normalization (`\r\n` → `\n` or vice versa)
- No HTML entity encoding of spaces (no `&nbsp;`)
- No collapsing of multiple consecutive spaces
- Output is `<pre data-braille-block ...><code>exact content here</code></pre>`

### End-to-End Tests

#### `tests/braille-fidelity.test.ts` (BUILD THIS FIRST)

Character-level fidelity tests through the full save → serialize → render cycle:

1. Create a ProseMirror JSON document containing a BrailleBlock with known multiline content including:
   - Multiple consecutive spaces (critical for braille alignment)
   - Leading spaces on lines
   - Trailing spaces on lines
   - Blank lines between braille lines
   - Tab characters (if applicable)
   - Special characters used in ASCII braille
2. Call `serializeToHtml()` on the JSON
3. Extract the text content from the `<pre>` element in the HTML output
4. Assert it matches the original text **exactly** (byte-for-byte comparison)

Test at minimum 5 different braille content samples with varying whitespace patterns.

#### `tests/publishing.test.ts`

Integration tests for the publish flow:

1. Create a document with prosemirror_json containing text + BrailleBlock + internal links
2. Call `publishDocument()`
3. Assert:
   - `rendered_html` is populated and valid HTML
   - `published_prosemirror_json` matches the input `prosemirror_json`
   - `status` is `'published'`
   - `published_at` is set
   - `document_links` rows are created for internal links
   - BrailleBlock content in `rendered_html` is character-for-character correct

## Verification

1. `pnpm --filter @braille-wiki/api test` — all tests pass
2. BrailleBlock fidelity tests pass with various whitespace patterns
3. Manual test: create a document with braille content in the admin editor, publish it, query `rendered_html` from the database, verify character-for-character fidelity
4. Publish flow creates correct `document_links` rows
5. Unpublish clears `rendered_html` and removes from search index
6. Discard draft restores `published_prosemirror_json` to `prosemirror_json`
7. Discard on a never-published document returns 422

## Notes

- **Build the braille fidelity tests FIRST** — before implementing the publish flow. This is the #1 architectural risk.
- The Orama index update call depends on plan 09. If implementing this plan before 09, mock the search update function.
- The Astro cache invalidation call depends on plan 10. If the Astro app isn't deployed yet, the publish flow should gracefully handle connection failures.
- The `document_links` rebuild uses a delete-then-insert strategy. This is safe because the table is a derived cache — it can be fully rebuilt from ProseMirror JSON at any time.
- Cross-reference invalidation: if page A links to page B, and page A is re-published with the link removed, page B's backlinks change. The publish flow must invalidate page B's cache too.
