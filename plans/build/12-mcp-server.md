# 12 — MCP Server

## Scope

Integrate the Model Context Protocol (MCP) server into the Hono API. Mount the MCP SDK's Streamable HTTP transport, register public and authenticated tools, and wire tool implementations to the existing service functions.

## Prerequisites

- **05 — Auth** (API key validation for write tools)
- **06 — API Core** (service functions that tools wrap)

## Unblocks

None — can be built in parallel with other feature plans once prerequisites are met.

## Reference Docs

- `plans/project-instructions.md` — "MCP Server" section
- `plans/routes.md` — "2d. MCP Protocol" section (tool table with parameters and return types)
- `plans/tech-stack.md` — "MCP Server" packages

## Packages to Install

In `apps/api/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `@modelcontextprotocol/sdk` | dependency | Official MCP TypeScript SDK — McpServer, tool registration, transport |
| `@modelcontextprotocol/hono` | dependency | Hono middleware adapter — wires MCP transport into Hono route handler |

## Deliverables

```
apps/api/
├── src/
│   ├── mcp/
│   │   ├── index.ts              # MCP server setup and Hono mounting
│   │   ├── tools/
│   │   │   ├── public.ts         # Public tools (no auth required)
│   │   │   └── authenticated.ts  # Authenticated tools (require API key)
│   │   └── auth.ts               # MCP-level API key validation
```

## Requirements

### MCP Server Setup (`src/mcp/index.ts`)

- Create an `McpServer` instance from `@modelcontextprotocol/sdk`
- Configure server metadata: name `"braille-wiki"`, version `"1.0.0"`, description
- Register all tools (public + authenticated)
- Use `@modelcontextprotocol/hono` to mount the MCP transport as a Hono route at `POST /mcp`
- The Hono middleware handles JSON body parsing, Host header validation, and SSE/Streamable HTTP transport

### MCP Auth (`src/mcp/auth.ts`)

Two-tier auth model:

- **No `x-api-key` header:** Public tools only. The MCP server should only expose public tools in the tool listing.
- **Valid `x-api-key` header:** Public + authenticated tools. Validate the API key via `auth.api.validateApiKey()` from better-auth.

Implementation:
- Extract the API key from the request before entering the MCP handler
- Pass the auth context (user info or null) into the MCP tool handlers
- Authenticated tools check for auth context and return an error if not provided

### Public Tools (`src/mcp/tools/public.ts`)

These are available to any MCP client, no API key required:

#### `search_docs`

- **Parameters:** `query` (string, required), `work` (string, optional), `limit` (number, optional)
- **Calls:** `searchDocuments()` from `services/search.ts`
- **Returns:** Array of `{ path, title, snippet, score }`

#### `get_document`

- **Parameters:** `path` (string, required)
- **Calls:** `getPublishedDocument()` from db package
- **Returns:** Title, description, rendered HTML, metadata, published_at
- Note: Returns rendered HTML, not ProseMirror JSON. Public tools only see published content.

#### `get_children`

- **Parameters:** `path` (string, optional — omit for root-level works)
- **Calls:** `getChildren()` from db package
- **Returns:** Array of `{ path, title, position, description }`

#### `get_tree`

- **Parameters:** `path` (string, required, e.g., `nemeth`)
- **Calls:** `getSidebarTree()` from db package, then builds nested structure
- **Returns:** Nested tree structure of the entire work

#### `get_backlinks`

- **Parameters:** `path` (string, required)
- **Calls:** `getBacklinks()` from db package
- **Returns:** Array of `{ path, title }`

### Authenticated Tools (`src/mcp/tools/authenticated.ts`)

These require a valid API key:

#### `get_draft`

- **Parameters:** `id` (string, UUID, required)
- **Calls:** `getDocument()` from `services/documents.ts`
- **Returns:** Full document including `prosemirror_json`, status, metadata

#### `update_document`

- **Parameters:** `id` (string, required), `prosemirror_json` (object, required), `title` (string, optional), `description` (string, optional)
- **Calls:** `saveDocument()` from `services/documents.ts`
- **Returns:** Updated document

#### `publish_document`

- **Parameters:** `id` (string, required)
- **Calls:** `publishDocument()` from `services/publishing.ts`
- **Returns:** Confirmation with published_at timestamp

#### `unpublish_document`

- **Parameters:** `id` (string, required)
- **Calls:** `unpublishDocument()` from `services/publishing.ts`
- **Returns:** Confirmation

#### `get_history`

- **Parameters:** `id` (string, required), `limit` (number, optional)
- **Calls:** `getRevisions()` from `services/revisions.ts`
- **Returns:** Array of `{ revision_id, action, created_by, created_at }`

#### `get_revision`

- **Parameters:** `revision_id` (string, required)
- **Calls:** `getRevision()` from `services/revisions.ts`
- **Returns:** The revision's `prosemirror_json`

#### `rollback_document`

- **Parameters:** `id` (string, required), `revision_id` (string, required)
- **Calls:** `rollbackDocument()` from `services/revisions.ts`
- **Returns:** Updated document (as new draft)

#### `move_document`

- **Parameters:** `id` (string, required), `new_parent_path` (string, required), `new_slug` (string, optional)
- **Calls:** `moveDocument()` from `services/navigation.ts`
- **Returns:** Updated document with new path

#### `reorder_children`

- **Parameters:** `parent_path` (string, required), `children` (array of UUIDs, required)
- **Calls:** `reorderChildren()` from `services/navigation.ts`
- **Returns:** Confirmation

### Tool Registration Pattern

Each tool is registered with the MCP SDK's `server.tool()` method:
- Tool name (string)
- Description (detailed, for LLM consumption — explain what the tool does and when to use it)
- Input schema (Zod schema — the MCP SDK uses Zod natively)
- Handler function (receives validated params, returns result)

Tool descriptions should be written for LLM consumption — clear, specific, with examples of when to use each tool.

### Error Handling

- Service function errors (404, 403, 422, etc.) should be caught and returned as MCP tool errors
- Invalid API key should return an MCP-level error, not crash the transport
- Network errors (e.g., cache invalidation failure during publish) should be handled gracefully

## Verification

1. `POST /mcp` responds to MCP protocol initialization
2. Without an API key: tool listing shows only 5 public tools
3. With a valid API key: tool listing shows all 14 tools
4. Test each public tool:
   - `search_docs` with a query returns results
   - `get_document` with a valid path returns published content
   - `get_children` returns child documents
   - `get_tree` returns nested structure
   - `get_backlinks` returns linking pages
5. Test authenticated tools:
   - `get_draft` returns full document with ProseMirror JSON
   - `update_document` saves changes
   - `publish_document` triggers the full publish flow
   - `rollback_document` restores from a revision
6. Invalid API key returns auth error, not a crash
7. Test with Claude Desktop or another MCP client to verify real-world compatibility

## Notes

- **Tools call the same service functions as REST endpoints.** No duplicated business logic. The MCP layer is a thin wrapper that validates input, calls the service, and formats the response.
- The MCP SDK's Zod dependency must be compatible with the Zod version used elsewhere in the project. Pin to the same version.
- `@modelcontextprotocol/hono` handles the transport setup. Don't manually implement SSE or Streamable HTTP.
- Tool descriptions are important — they're what LLMs read to decide which tool to call. Write them as if explaining to a helpful assistant.
- The MCP protocol supports resources and prompts in addition to tools. For now, only tools are implemented. Resources (e.g., document content as a resource) can be added later.
