# Plan: Migrate to Cloudflare Workers + Neon

## TL;DR

Migrate all three apps (API, web, admin) off Railway/Docker onto Cloudflare (Workers + Pages) and switch the database from self-managed Postgres (pg driver) to Neon serverless. The API and web app run on Cloudflare Workers; the admin SPA deploys to Cloudflare Pages. The DB package switches from `pg` Pool to `@neondatabase/serverless` + `drizzle-orm/neon-http`.

---

## Phase 1: Database — Switch to Neon (no runtime change yet)

This phase can be done first and tested on the current Node runtime before touching Workers.

1. **Create Neon project** — provision a Neon Postgres database, get the `DATABASE_URL` connection string.
2. **Migrate schema to Neon** — run `drizzle-kit push` or `drizzle-kit migrate` against the new Neon database.
3. **Swap DB driver in `packages/db`**
   - Replace `pg` + `drizzle-orm/node-postgres` with `@neondatabase/serverless` + `drizzle-orm/neon-http`
   - In `packages/db/src/client.ts`: replace `Pool` + `drizzle(node-postgres)` with `neon()` + `drizzle(neon-http)`
   - Remove `pg` and `@types/pg` from `packages/db/package.json`, add `@neondatabase/serverless`
   - Update `drizzle.config.ts` — keep dialect `postgresql`, just change dbCredentials to use Neon URL
4. **Fix raw SQL result format** — `db.execute()` returns different shapes per driver
   - `apps/api/src/auth/middleware.ts` — `rows.rows[0]` pattern (2 locations)
   - `apps/api/src/mcp/auth.ts` — `rows.rows[0]` pattern
   - `apps/api/src/seed.ts` — `rows.rows[0]` pattern + error code check
   - `apps/api/src/services/media.ts` — `result.rows[0]` in `isMediaReferenced()`
   - With neon-http, `db.execute()` returns rows directly (no `.rows` wrapper). Update all call sites.
5. **Verify** — run existing tests (`braille-fidelity.test.ts`, `publishing.test.ts`) and manually test auth, media upload, MCP against Neon.

**Files modified:**
- `packages/db/src/client.ts` — driver swap
- `packages/db/package.json` — dependency swap
- `packages/db/drizzle.config.ts` — credentials update (if needed)
- `apps/api/src/auth/middleware.ts` — fix `.rows` access
- `apps/api/src/mcp/auth.ts` — fix `.rows` access
- `apps/api/src/seed.ts` — fix `.rows` access + error handling
- `apps/api/src/services/media.ts` — fix `.rows` access in `isMediaReferenced()`

---

## Phase 2: Admin SPA → Cloudflare Pages

Easiest win — the admin app is a static Vite/React SPA with zero server-side logic.

1. **Add `_redirects` file** in `apps/admin/public/` with `/* /index.html 200` for SPA routing.
2. **Configure Cloudflare Pages project**
   - Build command: `pnpm --filter @braille-wiki/admin build` (from repo root)
   - Build output: `apps/admin/dist`
   - Environment variable: `VITE_API_URL` = the future Workers API URL
3. **Deploy and verify** — admin login, document editing, media upload all work against existing API.

**Files modified:**
- `apps/admin/public/_redirects` — new file (one line)

---

## Phase 3: API → Cloudflare Workers

The largest phase. Grouped into sub-steps with clear dependencies.

### 3a. Replace Node entrypoint (*depends on Phase 1*)

1. **Create `apps/api/src/worker.ts`** — new Workers entrypoint:
   - `export default { fetch: app.fetch }` pattern (per Hono docs)
   - Remove `dotenv/config` import, `@hono/node-server` serve call, PORT/HOST logic
   - Keep `apps/api/src/index.ts` as the Node entrypoint for local dev (optional)
2. **Create `apps/api/wrangler.toml`** — Workers configuration:
   - `main = "src/worker.ts"`
   - `compatibility_flags = ["nodejs_compat"]` (enables Node built-ins like crypto, Buffer)
   - Environment variables as secrets/vars
   - R2 bucket binding: `[[r2_buckets]]` with `binding = "MEDIA_BUCKET"` and `bucket_name = "<your-bucket>"`

### 3b. Refactor environment access (*parallel with 3a*)

1. **Refactor `process.env` → `c.env` or `env` parameter pattern** across:
   - `apps/api/src/app.ts` — CORS origin (1 location)
   - `apps/api/src/auth/index.ts` — auth secret, admin origin, NODE_ENV (4 locations)
   - `apps/api/src/lib/storage.ts` — all R2 vars will be replaced by native R2 bucket binding
   - `apps/api/src/lib/cache.ts` — ASTRO_INTERNAL_URL, INTERNAL_SECRET (2 locations)
   - `apps/api/src/seed.ts` — admin email/password (2 locations)
2. **Strategy**: Enable `nodejs_compat_populate_process_env` compatibility flag in wrangler.toml so `process.env` is auto-populated from bindings. This avoids rewriting every single `process.env` call. Alternatively, refactor to pass env explicitly — cleaner but more invasive.
   - **Recommendation**: Use `nodejs_compat_populate_process_env` flag for minimal rewrite. Can refactor to `c.env` later.

### 3c. Refactor module-level singletons (*depends on 3b*)

1. **Storage client** (`apps/api/src/lib/storage.ts`)
   - Currently creates `S3Client` at module level using `process.env`
   - **Switch to native R2 binding**: Replace entire S3Client with `env.MEDIA_BUCKET` (R2Bucket binding)
   - R2 API: `bucket.put(key, body, { httpMetadata: { contentType } })`, `bucket.delete(key)`, `bucket.get(key)`
   - Requires passing the R2 bucket from Hono context into storage functions
   - Remove `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` dependencies
   - Public URL: use R2 custom domain or `R2_PUBLIC_URL` env var (same as current pattern)
2. **Search index** (`apps/api/src/lib/search-index.ts`)
   - Currently uses in-memory Orama index with module-level state
   - Workers have no persistent memory across requests (unless using Durable Objects)
   - Options:
     - A: Rebuild index per-request (slow, defeats purpose)
     - B: Move to Cloudflare KV — serialize index, rebuild on publish, read from KV per-request
     - C: Keep Orama but lazy-init per isolate (Workers reuse isolates, so the index persists for some time)
   - **Recommendation**: Option C (lazy-init) for minimal change. The current code already lazy-builds. Workers isolates persist between requests in practice.
3. **DB client** (`packages/db/src/client.ts`)
   - After Phase 1, uses `@neondatabase/serverless` which is Workers-compatible
   - Module-level `drizzle()` init with `process.env.DATABASE_URL` — works with `nodejs_compat_populate_process_env`

### 3d. Replace Node-specific APIs (*parallel with 3c*)

1. **`apps/api/src/services/media.ts`**
   - `import { randomUUID } from "node:crypto"` → `crypto.randomUUID()` (Web Crypto API, available in Workers)
   - `import { extname } from "node:path"` → inline helper: `name.slice(name.lastIndexOf('.'))`
2. **`apps/api/src/routes/admin/media.ts`**
   - `Buffer.from(await file.arrayBuffer())` → with `nodejs_compat` flag, `Buffer` is available. Or use `new Uint8Array()`.
3. **`image-size` package** (`apps/api/src/services/media.ts`)
   - Uses `image-size` (sizeOf) which may use Node Buffer internals — test with `nodejs_compat`. Likely works.

### 3e. Handle startup side-effects (*depends on 3a*)

1. **`seedAdmin()`** — move to a separate CLI script (not runtime). Already optional (only runs if env vars set).
2. **`buildIndex()`** — lazy-initialize on first search request instead of at boot. The current code structure supports this (it's already promise-based).

### 3f. MCP route compatibility check

- `apps/api/src/mcp/index.ts` — uses `WebStandardStreamableHTTPServerTransport` which is Web Standards based. Should work on Workers as-is.
- Verify `@modelcontextprotocol/sdk` works in Workers runtime.

### 3g. Build pipeline

- API currently has no build step (`tsx` runs source directly). Workers need bundled output.
- Add build via `wrangler` (which uses esbuild internally) — just set `main = "src/worker.ts"` in wrangler.toml.
- Wrangler handles TypeScript transpilation and bundling automatically.

**Files modified (Phase 3):**
- `apps/api/src/worker.ts` — new Workers entrypoint
- `apps/api/wrangler.toml` — new Workers config
- `apps/api/package.json` — add wrangler dep, update scripts
- `apps/api/src/app.ts` — minor (if not using process.env compat flag)
- `apps/api/src/auth/index.ts` — minor (if not using process.env compat flag)
- `apps/api/src/lib/storage.ts` — rewrite to use native R2 bindings, remove S3 client
- `apps/api/src/lib/cache.ts` — minor env refactor
- `apps/api/src/lib/search-index.ts` — ensure lazy-init works without boot call
- `apps/api/src/services/media.ts` — replace node:crypto, node:path imports
- `apps/api/src/seed.ts` — extract to CLI-only script

---

## Phase 4: Web (Astro) → Cloudflare Workers/Pages

The web app uses SSR with `@astrojs/node` adapter and queries the DB directly.

1. **Switch Astro adapter** — replace `@astrojs/node` with `@astrojs/cloudflare`
   - `apps/web/astro.config.mjs` — change adapter import and config
   - `apps/web/package.json` — swap `@astrojs/node` for `@astrojs/cloudflare`
2. **Verify middleware compatibility** — `apps/web/src/middleware.ts` uses standard Astro middleware API, should work with Cloudflare adapter.
3. **Verify DB access** — `apps/web/src/lib/db.ts` imports from `@braille-wiki/db`. After Phase 1, this uses Neon serverless which is Workers-compatible.
4. **Add `wrangler.toml`** for the web app or use Cloudflare Pages with Functions.
5. **Test Starlight integration** — Starlight with `prerender: false` and custom components needs verification on Cloudflare runtime.

**Files modified:**
- `apps/web/astro.config.mjs` — adapter swap
- `apps/web/package.json` — dependency swap
- `apps/web/wrangler.toml` — new (if using Workers directly)

---

## Phase 5: Cleanup

1. **Remove Dockerfiles** — `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/admin/Dockerfile`
2. **Remove `railway.json` files** — `apps/api/railway.json`, `apps/web/railway.json`, `apps/admin/railway.json`
3. **Remove `docker-compose.dev.yml`**
4. **Remove `nginx.conf`** from admin
5. **Update deployment docs** in `plans/deployment-railway.md` → rename/replace with Cloudflare deployment docs
6. **Remove `@hono/node-server`**, `@aws-sdk/client-s3`, and `@aws-sdk/s3-request-presigner` from API dependencies

---

## Verification

1. **Phase 1**: Run `pnpm --filter @braille-wiki/db db:push` against Neon, then run `vitest` tests in `apps/api/tests/`
2. **Phase 2**: Deploy admin to CF Pages, verify login + document editing + media upload against existing API
3. **Phase 3**: Run `wrangler dev` locally for API, test all routes: auth, documents CRUD, media upload, search, MCP, publishing
4. **Phase 4**: Run `wrangler dev` or `astro dev --adapter cloudflare` for web, verify document rendering + search + cache invalidation
5. **End-to-end**: All three services on Cloudflare, full workflow: login → create doc → publish → view on public site

---

## Decisions

- **`nodejs_compat` flag**: Use it to minimize rewrites of `process.env`, `Buffer`, `node:crypto`. Can refactor to pure Web APIs later.
- **R2 storage**: Switch from `@aws-sdk/client-s3` to native R2 bindings (`env.MEDIA_BUCKET`) for simpler, faster storage access on Workers.
- **Search index**: Keep Orama in-memory with lazy init. Workers isolate reuse means the index persists across requests in practice.
- **Seed script**: Move out of runtime into a separate CLI migration step.
- **Local dev**: Keep Node entrypoint (`index.ts`) for `tsx watch` local dev alongside new `worker.ts` for Wrangler dev. Or switch fully to `wrangler dev`.

## Further Considerations

1. **Neon free tier vs paid** — Neon free tier gives 0.5 GB storage, 190 compute hours/month. Sufficient for small projects. Upgrade if needed.
2. **Workers limits** — Free plan: 100k requests/day, 10ms CPU per request. Paid plan ($5/mo): 10M requests, 30s CPU. Media upload may need paid plan for larger files.
3. **Astro + Cloudflare adapter maturity** — `@astrojs/cloudflare` is stable but verify Starlight compatibility specifically. If blockers found, web app could stay on a cheap Node host temporarily.
