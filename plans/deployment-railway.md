# Cloudflare Deployment (Monorepo)

This repository is deployed on Cloudflare using one project/service per app:

- API: Cloudflare Workers (`apps/api`)
- Web: Astro on Cloudflare (`apps/web`)
- Admin: Cloudflare Pages static site (`apps/admin`)

## Deployment Model

- API and web are deployed with Wrangler from their app folders.
- Admin is deployed to Cloudflare Pages from the monorepo root build.
- Database is Neon Postgres and shared by API and web through `DATABASE_URL`.
- Media storage uses Cloudflare R2 via the `MEDIA_BUCKET` binding.

## API (Workers)

Working directory: `apps/api`

Required files:

- `wrangler.toml`
- `src/worker.ts`

Recommended commands:

- Dev: `pnpm --filter @braille-docs/api dev`
- Deploy: `pnpm --filter @braille-docs/api deploy`

Required API bindings/secrets:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (public API URL)
- `ADMIN_ORIGIN` (admin public URL)
- `INTERNAL_SECRET` (must match web)
- `ASTRO_INTERNAL_URL` (web internal/public URL)
- `R2_PUBLIC_URL`
- R2 bucket binding: `MEDIA_BUCKET`

Optional seed-only values:

- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

## Web (Astro on Cloudflare)

Working directory: `apps/web`

Required files:

- `astro.config.mjs` configured with `@astrojs/cloudflare`
- `wrangler.toml`

Recommended commands:

- Dev: `pnpm --filter @braille-docs/web dev`
- Deploy: `pnpm --filter @braille-docs/web deploy`

Required web bindings/secrets:

- `DATABASE_URL`
- `INTERNAL_SECRET` (must match API)
- `PUBLIC_API_URL` (public API URL)

## Admin (Cloudflare Pages)

Working directory: repository root.

Pages project settings:

- Build command: `pnpm --filter @braille-docs/admin build`
- Build output directory: `apps/admin/dist`

Required environment variable:

- `VITE_API_URL` (public API URL)

SPA routing fallback is handled by `apps/admin/public/_redirects`.

## Cache Invalidation Flow

Publishing from API invalidates Astro cache tags through the web endpoint:

- API caller: `apps/api/src/lib/cache.ts`
- Web endpoint: `apps/web/src/pages/internal/cache-invalidate.ts`

Requirements:

- `INTERNAL_SECRET` must match across API and web.
- `ASTRO_INTERNAL_URL` in API must resolve to the web service.

## First Deploy Checklist

1. Provision Neon and set `DATABASE_URL` for API and web.
2. Create and bind R2 bucket as `MEDIA_BUCKET` for API.
3. Configure API and web Worker secrets/vars.
4. Configure Admin Pages project and `VITE_API_URL`.
5. Deploy API, web, and admin.
6. Run migrations once:
   - `pnpm --filter @braille-docs/db db:migrate`
7. Verify:
   - API OpenAPI JSON at `/api/openapi.json`
   - Admin login/edit/media upload
   - Public docs rendering and publish cache invalidation

## Notes

- Workers isolate memory is not durable; keep stateful data in Neon/R2.
- For local Workers parity, use Wrangler dev scripts in each app.
