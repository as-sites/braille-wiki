# Railway Deployment (Monorepo)

This repo is ready to deploy to Railway using one service per app and each service pointing to its own Dockerfile.

## Deployment Model

- Create a single Railway project connected to this repository.
- Create three services in the same project:
  - `api` from `apps/api/Dockerfile`
  - `web` from `apps/web/Dockerfile`
  - `admin` from `apps/admin/Dockerfile`
- Use Railway domains/custom domains per service instead of Traefik.

Traefik and `docker-compose.yml` remain useful for self-hosted/container deployments, but are not required on Railway.

## Service Configuration (Railway Monorepo)

For each Railway service, set:

- Source repo: this monorepo
- Root directory: `.`
- Builder: Dockerfile
- Dockerfile path:
  - API: `apps/api/Dockerfile`
  - Web: `apps/web/Dockerfile`
  - Admin: `apps/admin/Dockerfile`

Railway injects `PORT` automatically. The API and web services already honor it; admin now does too.

## Environment Variables

Set shared secrets consistently across services where needed.

### API service

Required:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (your API public URL)
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`
- `INTERNAL_SECRET` (must match web service)
- `ASTRO_INTERNAL_URL` (web service URL, internal/private URL preferred)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `ADMIN_ORIGIN` (admin public URL)

Optional:

- `PUBLIC_API_URL` (if needed by API-side consumers)

### Web service

Required:

- `DATABASE_URL`
- `INTERNAL_SECRET` (must match API service)
- `PUBLIC_API_URL` (API public URL)

### Admin service

Required build/runtime variable:

- `VITE_API_URL` (API public URL)

## Internal Cache Invalidation on Railway

Publishing from the API invalidates Astro cache tags by POSTing to the web service endpoint:

- API caller: `apps/api/src/lib/cache.ts`
- Web endpoint: `apps/web/src/pages/internal/cache-invalidate.ts`

To make this work in Railway:

- Set `ASTRO_INTERNAL_URL` in API to the web service URL.
- Set the same `INTERNAL_SECRET` in both API and web.
- Keep web service reachable from API (internal URL preferred).

## First Deploy Checklist

1. Provision Neon Postgres and Cloudflare R2.
2. Add all service environment variables in Railway.
3. Deploy all three services.
4. Run migrations once from the API service environment:
   - `pnpm --filter @braille-docs/db db:migrate`
5. Verify endpoints:
   - API OpenAPI JSON: `/api/openapi.json`
   - Admin SPA loads and authenticates
   - Docs site loads
6. Publish one document and confirm docs refresh without manual restart.

## Notes

- In-memory cache in Astro is instance-local. If web runs multiple instances, invalidation must hit each instance or move to a shared cache strategy.
- The current API Docker runtime executes TypeScript via Node + tsx import; this is acceptable on Railway, but you can optimize later with an explicit build artifact/runtime split.