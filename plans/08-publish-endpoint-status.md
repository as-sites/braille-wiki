# 08 Publish Endpoint Status

## Summary

The publish endpoint is implemented in the API and wired through the admin client. The failure observed during publish was a runtime environment issue, not a missing endpoint.

## Implemented Paths

- API route: `POST /api/admin/documents/:id/publish`
- API service function: publish orchestration in `apps/api/src/services/publishing.ts`
- Admin client call: `client.POST("/api/admin/documents/{id}/publish", ...)`
- OpenAPI contract entry: `/api/admin/documents/{id}/publish`

## Root Cause of 500 Error

Publish failed with:

"generateHTML can only be used in a browser environment"

Cause:

- `packages/editor-schema/src/serializer.ts` used `@tiptap/html` (browser entrypoint)
- Publish runs on the Node API server and requires `@tiptap/html/server`

## Fix Applied

1. Added a Node-safe serializer function:
   - `serializeToHtmlServer(...)` in `packages/editor-schema/src/serializer.ts`
   - Uses `generateHTML` from `@tiptap/html/server`
2. Updated API publish flow to use `serializeToHtmlServer(...)` in `apps/api/src/services/publishing.ts`
3. Kept browser serializer `serializeToHtml(...)` for admin preview usage
4. Updated admin editor publish error handling to show real backend errors instead of the stale "planned for step 08" message

## Verification

- Typecheck passed:
  - `pnpm --filter @braille-docs/editor-schema typecheck`
  - `pnpm --filter @braille-docs/api typecheck`
- Publish flow tests passed:
  - `pnpm --filter @braille-docs/api exec vitest run tests/publishing.test.ts`
  - Result: 18 passed, 0 failed

## Notes

- The Starlight warning about no files in `src/content/docs` is unrelated to API publish and only indicates empty docs content for the Starlight loader.