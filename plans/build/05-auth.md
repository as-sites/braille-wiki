# 05 — Authentication

## Scope

Set up better-auth in the Hono API service. Configure session-based authentication for the admin SPA, API key authentication for MCP/external clients, user schema extension with roles, and auth middleware for protected routes.

## Prerequisites

- **01 — Monorepo Scaffolding** (workspace structure)
- **02 — Database Package** (Postgres connection for better-auth's tables)

## Unblocks

- 06 (API Core — needs auth middleware)
- 07 (Editor + BrailleBlock — needs session auth for API calls)
- 10 (Public Docs Site — no auth needed, but unblocked for integration)
- 11 (Media — needs auth for upload endpoints)
- 12 (MCP Server — needs API key validation)
- 13 (Admin UI Shell — needs login flow)

## Reference Docs

- `plans/project-instructions.md` — "Authentication: better-auth" section
- `plans/routes.md` — "2b. Auth Routes" and auth model for all routes
- `plans/database-schema.md` — "Auth tables" section

## Packages to Install

In `apps/api/package.json`:

| Package | Type | Purpose |
|---------|------|---------|
| `hono` | dependency | HTTP framework (needed for auth route mounting) |
| `@hono/node-server` | dependency | Node.js adapter for Hono |
| `better-auth` | dependency | Auth library — sessions, users, roles |
| `@better-auth/api-key` | dependency | API key plugin for MCP access |

## Deliverables

```
apps/api/
├── src/
│   ├── auth/
│   │   ├── index.ts              # better-auth instance creation and export
│   │   ├── middleware.ts         # Hono middleware: requireSession, requireApiKey, requireAuth (either), requireAdmin
│   │   └── client.ts            # Auth client config (for admin SPA — re-exported type)
```

## Requirements

### better-auth Instance (`src/auth/index.ts`)

Create and export the better-auth instance with:

- **Database:** Use the Drizzle adapter with the shared `db` instance from `@braille-docs/db`
- **User schema extension:** Add a `role` field to the user table with values `'admin' | 'editor'`, defaulting to `'editor'`
- **Session configuration:** Cookie-based sessions. Configure `sameSite`, `secure`, `httpOnly` appropriately for the admin SPA (which may be on a different subdomain).
- **Plugins:**
  - `apiKey()` from `@better-auth/api-key` — enables API key generation and validation

### Auth Route Mounting

- Mount better-auth's handler at `/api/auth/*` in the Hono app as a catch-all route
- better-auth manages its own sub-routes (login, logout, session, signup, etc.)

### Middleware (`src/auth/middleware.ts`)

Create four Hono middleware functions:

#### `requireSession`
- Validates the session cookie via `auth.api.getSession()`
- Returns 401 if no valid session
- Attaches user info (id, email, name, role) to the Hono context (`c.set('user', ...)`)

#### `requireApiKey`
- Validates the `x-api-key` header via `auth.api.validateApiKey()`
- Returns 401 if invalid or missing
- Attaches the associated user info to the Hono context

#### `requireAuth`
- Accepts EITHER a valid session cookie OR a valid API key
- Tries session first, falls back to API key
- Returns 401 if neither is present
- This is the primary middleware for `/api/admin/*` routes

#### `requireAdmin`
- Must be used AFTER `requireAuth`
- Checks that the authenticated user's role is `'admin'`
- Returns 403 if the user is an `'editor'`
- Used on user management endpoints

### Role Model

Two roles only, no RBAC plugin:

| Role | Can edit/publish content | Can manage users | Can delete admins |
|------|------------------------|-----------------|-------------------|
| `admin` | Yes | Yes | No (only another admin can) |
| `editor` | Yes | No | No |

Role guards are implemented as middleware checks, not as a permissions engine.

### Initial Admin User

- Provide a seed script or startup check that creates an initial admin user if the `user` table is empty
- Use environment variables for the initial admin's email and password (`INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`)
- Add these to `.env.example`

### CORS Configuration

- The admin SPA runs on a different origin than the API in development (Vite dev server vs Hono)
- Configure CORS on the Hono app to allow the admin SPA's origin
- Allow credentials (cookies) in CORS
- Add `ADMIN_ORIGIN` to `.env.example`

## Verification

1. `pnpm --filter @braille-docs/api typecheck` passes
2. Start the Hono server and verify:
   - `POST /api/auth/sign-up/email` creates a user with `role: 'editor'`
   - `POST /api/auth/sign-in/email` returns a session cookie
   - A request with a valid session cookie to a protected route returns 200
   - A request without auth to a protected route returns 401
   - `POST /api/admin/api-keys` (with session) generates an API key
   - A request with the API key in `x-api-key` header to a protected route returns 200
   - An editor trying to access an admin-only route returns 403
3. better-auth's tables (user, session, account, etc.) are created in Postgres
4. The seed/startup script creates an initial admin user when the user table is empty

## Notes

- Do NOT manually create or modify better-auth's tables — it manages its own migrations
- The `role` field is added via better-auth's user schema extension API, not by altering the table directly
- Session cookies need `sameSite: 'lax'` (or `'none'` with `secure: true`) if the admin SPA is on a different subdomain
- The `BETTER_AUTH_SECRET` env var must be set — it's used for session signing
- better-auth's built-in routes handle email/password auth. No OAuth providers are configured at this stage.
- The admin SPA will need a better-auth client-side helper — the types for this are exported but the actual client setup is in plan 07/13
