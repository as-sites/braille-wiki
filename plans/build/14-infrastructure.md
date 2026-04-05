# 14 — Infrastructure

## Scope

Containerize all three services, configure Docker Compose for local development and production-like deployment, set up Traefik as a reverse proxy with routing and TLS, configure internal Docker networking for the cache invalidation flow, and document environment variable management.

## Prerequisites

- **06 — API Core** (Hono API must be buildable)
- **10 — Public Docs Site** (Astro app must be buildable)

## Unblocks

None — this is the final plan.

## Reference Docs

- `plans/project-instructions.md` — "Infrastructure & Deployment" section
- `plans/tech-stack.md` — "Infrastructure & Deployment" section
- `plans/routes.md` — Architecture diagram showing Traefik routing

## Packages to Install

No npm packages — this plan works with Docker, Traefik, and configuration files.

## Deliverables

```
braille-wiki/
├── docker-compose.yml            # Full Docker Compose config (replace skeleton from plan 01)
├── docker-compose.dev.yml        # Dev overrides (volume mounts, hot reload)
├── apps/
│   ├── web/
│   │   └── Dockerfile            # Astro Node SSR container
│   ├── api/
│   │   └── Dockerfile            # Hono Node container
│   └── admin/
│       └── Dockerfile            # Build static files, serve with lightweight server
├── traefik/
│   ├── traefik.yml               # Static Traefik configuration
│   └── dynamic/
│       └── routes.yml            # Dynamic routing rules
├── .env.example                  # Updated with all env vars (update from plan 01)
└── scripts/
    └── setup.sh                  # First-time setup script (generate secrets, check deps)
```

## Requirements

### Dockerfiles

#### `apps/web/Dockerfile` (Astro)

- Multi-stage build:
  1. **Builder stage:** Install deps with pnpm, build the Astro app (includes workspace packages)
  2. **Runner stage:** Minimal Node image, copy built output, run with Node adapter
- Expose port 4321 (Astro default)
- Environment variables: `DATABASE_URL`, `INTERNAL_SECRET`, `PUBLIC_API_URL`

#### `apps/api/Dockerfile` (Hono)

- Multi-stage build:
  1. **Builder stage:** Install deps with pnpm, build the API (includes workspace packages)
  2. **Runner stage:** Minimal Node image, copy built output, run with Node
- Expose port 3001
- Environment variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `INTERNAL_SECRET`, `ASTRO_INTERNAL_URL`, `R2_*`, `ADMIN_ORIGIN`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`

#### `apps/admin/Dockerfile` (Admin SPA)

- Multi-stage build:
  1. **Builder stage:** Install deps with pnpm, build the Vite SPA (produces static files)
  2. **Runner stage:** Lightweight static file server (e.g., `nginx:alpine` or `caddy:alpine`)
- Expose port 8080
- Build-time environment variable: `VITE_API_URL`
- Nginx/Caddy config: serve `index.html` for all routes (SPA fallback)

### Monorepo Build Context

All Dockerfiles need access to the full monorepo (root `package.json`, `pnpm-workspace.yaml`, workspace packages). Options:

- **Option A:** Build context is the repo root, Dockerfile is at `apps/<app>/Dockerfile`. Use `.dockerignore` to exclude unnecessary files.
- **Option B:** Use Docker BuildKit with `--build-context` for workspace packages.

Recommend Option A for simplicity. Each Dockerfile's build context is the repo root:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
```

### Docker Compose (`docker-compose.yml`)

#### Services

```yaml
services:
  traefik:
    image: traefik:v3
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik:/etc/traefik

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    env_file: .env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.${DOMAIN}`)"
      - "traefik.http.services.api.loadbalancer.server.port=3001"
    networks:
      - internal
      - web

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    env_file: .env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`docs.${DOMAIN}`)"
      - "traefik.http.services.web.loadbalancer.server.port=4321"
    networks:
      - internal
      - web

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.${DOMAIN}`)"
      - "traefik.http.services.admin.loadbalancer.server.port=8080"
    networks:
      - web

networks:
  internal:
    internal: true    # Not exposed to the outside — used for web ↔ api communication
  web:
    external: false
```

#### Key networking detail

- The `web` (Astro) and `api` (Hono) services share the `internal` network
- The cache invalidation call from Hono → Astro uses the Docker service name: `ASTRO_INTERNAL_URL=http://web:4321`
- The `internal` network is not exposed to the outside
- The `admin` SPA does NOT need the internal network — it only talks to the API through Traefik

### Docker Compose Dev Overrides (`docker-compose.dev.yml`)

```yaml
services:
  api:
    build: !reset null
    command: pnpm --filter @braille-docs/api dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3001:3001"

  web:
    build: !reset null
    command: pnpm --filter @braille-docs/web dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "4321:4321"

  admin:
    build: !reset null
    command: pnpm --filter @braille-docs/admin dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5173:5173"
```

For development, run services directly with volume mounts for hot reload. Use `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.

### Traefik Configuration

#### `traefik/traefik.yml` (static config)

- Entry points: `web` (port 80), `websecure` (port 443)
- HTTP → HTTPS redirect
- Let's Encrypt TLS certificate resolver (or self-signed for local dev)
- Docker provider enabled (reads labels from containers)
- Dashboard enabled (password-protected)

#### `traefik/dynamic/routes.yml` (dynamic config)

- Additional middleware:
  - Rate limiting on public API endpoints
  - Basic auth or IP allowlist for admin routes (optional additional layer)

### Routing Rules

| Hostname | Service | Notes |
|----------|---------|-------|
| `docs.<domain>` | Astro (web) | Public docs site |
| `api.<domain>` | Hono (api) | REST API, MCP server, auth |
| `admin.<domain>` | Admin SPA | Static files with SPA fallback |

### Environment Variables (`.env.example` update)

Update the `.env.example` from plan 01 with all variables across all services:

```env
# Domain
DOMAIN=example.com

# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=

# Internal
INTERNAL_SECRET=
ASTRO_INTERNAL_URL=http://web:4321

# R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Public URLs
PUBLIC_API_URL=https://api.example.com
VITE_API_URL=https://api.example.com
ADMIN_ORIGIN=https://admin.example.com
```

### Setup Script (`scripts/setup.sh`)

A helper script for first-time setup:
- Check for required tools (Docker, pnpm, Node)
- Generate random secrets for `BETTER_AUTH_SECRET` and `INTERNAL_SECRET`
- Copy `.env.example` to `.env` and prompt for values
- Run `pnpm install`
- Run database migrations

## Verification

1. `docker compose build` — all three services build successfully
2. `docker compose up` — all services start, Traefik routes traffic correctly
3. `https://docs.<domain>` serves the public docs site
4. `https://api.<domain>/api/search?q=test` returns search results
5. `https://admin.<domain>` serves the admin SPA, login works
6. Cache invalidation: publish a doc via the admin SPA, verify the Astro cache is invalidated (check Hono logs for the internal call)
7. Internal network isolation: the cache invalidation endpoint is NOT accessible from outside Docker
8. TLS certificates are provisioned (Let's Encrypt or self-signed)
9. `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` starts dev mode with hot reload

## Notes

- Neon Postgres is external (managed service) — no Postgres container in Docker Compose.
- Cloudflare R2 is external — no S3-compatible container in Docker Compose (though MinIO could be added for local dev).
- The admin SPA's `VITE_API_URL` is a **build-time** variable (baked into the JS bundle). In production, this should point to the public API URL. For development with the Vite proxy, it can be empty (relative URLs).
- Consider adding health check endpoints to each service for Docker health monitoring.
- The Traefik dashboard should be password-protected or disabled in production.
- For CI/CD (Gitea Actions or similar), each service can be built and pushed independently. The Docker Compose file coordinates them for deployment.
