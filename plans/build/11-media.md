# 11 — Media

## Scope

Implement media management: Cloudflare R2 integration for file storage, media CRUD endpoints in the Hono API, media library page in the admin SPA, image insertion in the Tiptap editor, and publish-time image URL resolution.

## Prerequisites

- **05 — Auth** (auth middleware for media endpoints)
- **06 — API Core** (Hono app, stub media routes to fill in)
- **07 — Editor + BrailleBlock** (Tiptap editor to add image insertion)

## Unblocks

None — this can be built in parallel with plans 08-10.

## Reference Docs

- `plans/routes.md` — "2c. Media" endpoints
- `plans/database-schema.md` — `media` table
- `plans/tech-stack.md` — "Media Storage" section
- `plans/project-instructions.md` — "How images are referenced" in db schema notes

## Packages to Install

In `apps/api/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `@aws-sdk/client-s3` | dependency | S3-compatible client for R2 operations |
| `@aws-sdk/s3-request-presigner` | dependency | Generate presigned URLs for direct uploads (optional) |

## Deliverables

```
apps/api/
├── src/
│   ├── services/
│   │   └── media.ts              # Media business logic
│   ├── lib/
│   │   └── r2.ts                 # R2 client setup and helper functions
│   └── routes/
│       └── admin/
│           └── media.ts          # Fill in stub from plan 06

apps/admin/
├── src/
│   ├── pages/
│   │   └── MediaPage.tsx         # Media library page
│   └── components/
│       ├── media/
│       │   ├── MediaLibrary.tsx   # Browse/search/filter media grid
│       │   ├── MediaUpload.tsx    # Upload component (drag-and-drop + file picker)
│       │   ├── MediaCard.tsx      # Individual media item display
│       │   └── MediaPicker.tsx    # Modal for selecting media in the editor
│       └── editor/
│           └── ImageInsert.tsx    # Toolbar button for inserting images via media picker
```

## Requirements

### R2 Client (`apps/api/src/lib/r2.ts`)

- Create an S3 client configured for Cloudflare R2:
  - `endpoint`: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
  - `credentials`: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` from env
  - `region`: `auto`
- Export helper functions:
  - `uploadToR2(key: string, body: Buffer, contentType: string)` — PutObject
  - `deleteFromR2(key: string)` — DeleteObject
  - `getPublicUrl(key: string): string` — Construct the public URL for R2 (or CDN URL if configured via `R2_PUBLIC_URL` env var)

### Media Service (`apps/api/src/services/media.ts`)

- `uploadMedia(file, metadata, userId)`:
  1. Generate a UUID-based storage key: `media/<uuid>.<extension>`
  2. Upload file to R2 via `uploadToR2()`
  3. Extract image dimensions if applicable (use file metadata or a lightweight image lib)
  4. Create `media` row via `createMedia()` from db package
  5. Return the new media record

- `getMedia(id)` — Get single media record. 404 if not found.

- `listMedia(filters)` — Paginated list with optional `mimeType` and `search` filters.

- `updateMedia(id, data)` — Update `alt_text` and/or `filename`.

- `deleteMedia(id)`:
  1. Check if media ID is referenced in any document's `prosemirror_json` (search for the UUID in the JSONB column). If referenced, return a warning (but still allow deletion with confirmation).
  2. Delete from R2 via `deleteFromR2()`
  3. Delete the `media` row

### Media Endpoints (`apps/api/src/routes/admin/media.ts`)

Fill in the stubs from plan 06:

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/admin/media` | List media with pagination, filters |
| `POST` | `/api/admin/media` | Upload — accepts `multipart/form-data`. Fields: `file` (required), `alt_text` (optional) |
| `PUT` | `/api/admin/media/:id` | Update metadata |
| `DELETE` | `/api/admin/media/:id` | Delete with reference warning |

### Publish-Time Image Resolution

When the HTML serializer encounters an `image` node in ProseMirror JSON, it needs to resolve the `media.id` attribute to a public URL. Update the serialization in `packages/editor-schema` or the publish service:

- The image node stores `{ src: media_id }` in ProseMirror JSON
- At publish time, look up the media record to get `storage_key`
- Construct the public URL: `getPublicUrl(storage_key)`
- Also include `alt_text` from the media record in the `<img>` tag
- The serializer needs access to a URL resolver function — pass it as a parameter or configure it

### Admin SPA: Media Library Page

#### `MediaLibrary.tsx`

- Grid view of all media with thumbnails
- Search by filename / alt_text
- Filter by mime_type
- Pagination or infinite scroll
- Click an item to open detail view (edit alt_text, see dimensions/size, delete)

#### `MediaUpload.tsx`

- Drag-and-drop zone + file picker button
- Show upload progress
- Accept images (png, jpg, gif, svg, webp) and PDFs
- Max file size validation (configurable, e.g., 10MB)
- After upload, show the new media item

#### `MediaPicker.tsx`

- Modal version of the media library for use inside the editor
- Browse/search existing media, or upload new
- On select, returns the media ID and URL for insertion into the editor

### Admin SPA: Editor Image Insertion

#### `ImageInsert.tsx`

- Add a toolbar button in the Tiptap editor toolbar
- On click, open `MediaPicker` modal
- On media selection, insert an `image` node into the editor at the cursor position
- The image node stores `{ src: media_id }` — not the R2 URL directly
- Display the image in the editor using a preview URL (can be the R2 public URL for display purposes)

## Verification

1. Upload an image via `POST /api/admin/media` — file appears in R2, media row created in Postgres
2. `GET /api/admin/media` lists the uploaded image with correct metadata
3. Update alt_text via `PUT /api/admin/media/:id` — persists correctly
4. Delete media via `DELETE /api/admin/media/:id` — removed from R2 and Postgres
5. In the admin SPA, the media library page shows uploaded media
6. Drag-and-drop upload works in the media library
7. In the editor, the image toolbar button opens the media picker
8. Selecting an image from the picker inserts it into the editor
9. Publishing a document with images produces `<img>` tags with correct R2 URLs and alt text

## Notes

- Image dimension extraction: for a lightweight approach, the file's dimensions can be read from the image header without fully decoding the image. Consider `image-size` npm package if needed (dev dependency).
- The media reference check (before delete) is a best-effort search through `prosemirror_json` JSONB columns. It's not a foreign key constraint — media can be deleted even if referenced.
- R2 public URLs require the bucket to have public access enabled, or use a custom domain / Cloudflare CDN in front. The `R2_PUBLIC_URL` env var should be configurable.
- Presigned URLs for direct client uploads are an optimization — for now, proxy uploads through the Hono API. Add presigned URL support later if upload performance is a concern.
