import type { Context, MiddlewareHandler, Next } from "hono";
import { sql, db } from "@braille-docs/db";
import { auth } from "./index";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AuthVariables = {
  user: AuthUser;
};

// ---------------------------------------------------------------------------
// requireSession
// Validates the session cookie. Attaches user to context or returns 401.
// ---------------------------------------------------------------------------
export const requireSession: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as AuthUser & { role?: string }).role ?? "editor",
  });

  return next();
};

// ---------------------------------------------------------------------------
// requireApiKey
// Validates the x-api-key header. Attaches user to context or returns 401.
// ---------------------------------------------------------------------------
export const requireApiKey: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  const key = c.req.header("x-api-key");

  if (!key) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await auth.api.verifyApiKey({ body: { key } });

  if (!result.valid || !result.key) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  const userId = result.key.referenceId;

  const rows = await db.execute<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>(sql`SELECT id, email, name, role FROM "user" WHERE id = ${userId} LIMIT 1`);

  const userRows = Array.isArray(rows)
    ? rows
    : ((rows as { rows?: Array<{ id: string; email: string; name: string; role: string }> }).rows ?? []);
  const user = userRows[0];

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", { id: user.id, email: user.email, name: user.name, role: user.role ?? "editor" });

  return next();
};

// ---------------------------------------------------------------------------
// requireAuth
// Accepts either a valid session cookie OR a valid API key. Returns 401 if neither.
// ---------------------------------------------------------------------------
export const requireAuth: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  // Try session first
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session?.user) {
    c.set("user", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user as AuthUser & { role?: string }).role ?? "editor",
    });
    return next();
  }

  // Fall back to API key
  const key = c.req.header("x-api-key");

  if (key) {
    const result = await auth.api.verifyApiKey({ body: { key } });

    if (result.valid && result.key) {
      const userId = result.key.referenceId;

      const rows = await db.execute<{
        id: string;
        email: string;
        name: string;
        role: string;
      }>(sql`SELECT id, email, name, role FROM "user" WHERE id = ${userId} LIMIT 1`);

      const userRows = Array.isArray(rows)
        ? rows
        : ((rows as { rows?: Array<{ id: string; email: string; name: string; role: string }> }).rows ?? []);
      const user = userRows[0];

      if (user) {
        c.set("user", { id: user.id, email: user.email, name: user.name, role: user.role ?? "editor" });
        return next();
      }
    }
  }

  return c.json({ error: "Unauthorized" }, 401);
};

// ---------------------------------------------------------------------------
// requireAdmin
// Must run AFTER requireAuth. Returns 403 if the user's role is not 'admin'.
// ---------------------------------------------------------------------------
export const requireAdmin: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const user = c.get("user");

  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  return next();
};
