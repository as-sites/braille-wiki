# 01 — Monorepo Scaffolding

## Scope

Set up the pnpm workspace, Nx task runner, TypeScript configuration, and full directory structure for the monorepo. Create stub `package.json` files for all apps and packages so that subsequent plans can install their own dependencies incrementally.

## Prerequisites

None — this is the first plan.

## Unblocks

All subsequent plans.

## Reference Docs

- `plans/tech-stack.md` — "Monorepo Structure" section (directory layout, Nx config, pnpm workspace)
- `plans/project-instructions.md` — "Architecture: Three Services" section

## Packages to Install

### Root `devDependencies`

| Package | Purpose |
|---------|---------|
| `nx` | Task runner — dependency-aware build orchestration, caching |
| `typescript` | Shared TypeScript compiler |

### No app-level packages yet

Each subsequent plan installs its own packages. This plan only creates the skeleton.

## Deliverables

### Files to Create

```
braille-wiki/
├── mise.toml                    # mise version pins — node 24, pnpm 10
├── package.json                  # Root — workspaces config, devDeps only
├── pnpm-workspace.yaml           # Workspace definition
├── nx.json                       # Nx task runner config
├── tsconfig.base.json            # Shared TS compiler options (path aliases, strict mode)
├── .env.example                  # Template for environment variables
├── .gitignore                    # Node, build artifacts, .env, nx cache
├── docker-compose.yml            # Skeleton with service stubs (filled in plan 14)
│
├── apps/
│   ├── web/
│   │   ├── package.json          # @braille-wiki/web — stub
│   │   └── tsconfig.json         # Extends tsconfig.base.json
│   ├── api/
│   │   ├── package.json          # @braille-wiki/api — stub
│   │   └── tsconfig.json
│   └── admin/
│       ├── package.json          # @braille-wiki/admin — stub
│       └── tsconfig.json
│
├── packages/
│   ├── db/
│   │   ├── package.json          # @braille-wiki/db — stub
│   │   └── tsconfig.json
│   ├── shared/
│   │   ├── package.json          # @braille-wiki/shared — stub
│   │   └── tsconfig.json
│   └── editor-schema/
│       ├── package.json          # @braille-wiki/editor-schema — stub
│       └── tsconfig.json
```

## Requirements

### Root `package.json`

- `"private": true`
- No runtime dependencies — only `devDependencies` (nx, typescript)
- Scripts: `"dev"`, `"build"`, `"typecheck"` — all delegating to `nx run-many`

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `nx.json`

- Package-based mode (no `project.json` files per package)
- `targetDefaults` for: `build` (depends on `^build`, cached), `dev` (not cached), `typecheck` (depends on `^build`, cached), `db:generate` (not cached), `db:migrate` (not cached)

### `tsconfig.base.json`

- `"strict": true`
- `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
- Path aliases for workspace packages:
  - `@braille-wiki/db` → `packages/db/src`
  - `@braille-wiki/shared` → `packages/shared/src`
  - `@braille-wiki/editor-schema` → `packages/editor-schema/src`

### Stub `package.json` for Each App/Package

- Correct `name` field (e.g., `@braille-wiki/api`)
- `"private": true`
- Empty `dependencies` and `devDependencies` (filled by later plans)
- `"main"` and `"types"` pointing to `src/index.ts` for packages
- Basic scripts: `"build"`, `"dev"`, `"typecheck"`

### `.env.example`

List all environment variables the project will need (values blank):

- `DATABASE_URL` — Neon Postgres connection string
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` — Cloudflare R2
- `BETTER_AUTH_SECRET` — Session signing secret
- `INTERNAL_SECRET` — Shared secret for Astro ↔ Hono internal cache invalidation
- `PUBLIC_API_URL` — URL of the Hono API (for Astro search modal and admin SPA)

### `.gitignore`

- `node_modules/`, `dist/`, `.nx/`, `.env`, `*.tsbuildinfo`

### `docker-compose.yml`

- Skeleton with commented-out service definitions for `web`, `api`, `admin`, and `traefik`
- Will be filled in by plan 14

## Verification

1. `pnpm install` completes without errors
2. `pnpm nx graph` shows all 6 projects (3 apps + 3 packages) with correct dependency relationships
3. `pnpm nx run-many -t typecheck` runs (may produce "no input files" warnings since src/ dirs are empty — that's fine)
4. Each package's `tsconfig.json` correctly extends `tsconfig.base.json`

## Notes

- Use pnpm 9+ for native workspace support
- Nx is used in package-based mode only — no `project.json`, no generators, no executors
- Do NOT install app-specific packages (Hono, Astro, React, etc.) in this plan — those come in their respective plans
- The `docker-compose.yml` is intentionally a skeleton here — plan 14 fills it in
- TypeScript 6 deprecated `baseUrl`. Path aliases use `./`-prefixed relative values in `tsconfig.base.json` and work without `baseUrl` under `moduleResolution: bundler`
- Each app/package has a `src/index.ts` placeholder so `tsc --noEmit` succeeds before real source is added
- `pnpm.onlyBuiltDependencies: ["nx"]` in root `package.json` pre-approves nx's install scripts (pnpm 10 security requirement)
