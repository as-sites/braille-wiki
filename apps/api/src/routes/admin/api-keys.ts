import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";

import { db, sql } from "@braille-wiki/db";

import * as schemas from "../../openapi/schemas";
import { auth } from "../../auth";
import type { AuthVariables } from "../../auth/middleware";

type AdminContext = Context<{ Variables: AuthVariables }>;

type CreateApiKeyResult = {
  id: string;
  name: string | null;
  key: string;
  createdAt: Date | string;
};

/**
 * Admin API key routes (authentication required).
 */

export function registerAdminAPIKeyRoutes(app: OpenAPIHono<{ Variables: AuthVariables }>) {
  // =========================================================================
  // GET /api/admin/api-keys
  // =========================================================================
  const listRoute = createRoute({
    method: "get",
    path: "/api/admin/api-keys",
    tags: ["Admin - API Keys"],
    summary: "List API keys for the current user",
    responses: {
      200: {
        description: "API keys list",
        content: {
          "application/json": {
            schema: schemas.APIKeyListResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
    },
  });

  app.openapi(listRoute, async (c: AdminContext) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const rows = await db.execute<{
      id: string;
      name: string | null;
      created_at: Date | string;
      last_request: Date | string | null;
    }>(sql`
      SELECT id, name, created_at, last_request
      FROM apikey
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `);

    const keys = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: Array<{ id: string; name: string | null; created_at: Date | string; last_request: Date | string | null }> }).rows ?? []);

    return c.json(
      keys.map((key) => ({
        id: key.id,
        name: key.name ?? "Untitled key",
        createdAt: new Date(key.created_at).toISOString(),
        lastUsedAt: key.last_request ? new Date(key.last_request).toISOString() : null,
      })),
    );
  });

  // =========================================================================
  // POST /api/admin/api-keys
  // =========================================================================
  const createRoute_ = createRoute({
    method: "post",
    path: "/api/admin/api-keys",
    tags: ["Admin - API Keys"],
    summary: "Generate a new API key",
    request: {
      body: {
        content: {
          "application/json": {
            schema: schemas.CreateAPIKeyRequest,
          },
        },
      },
    },
    responses: {
      201: {
        description: "API key created",
        content: {
          "application/json": {
            schema: schemas.CreateAPIKeyResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
    },
  });

  app.openapi(createRoute_, async (c: AdminContext) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const body = await c.req.json<{ name: string }>();

    const api = auth.api as {
      createApiKey?: (args: {
        body: {
          name: string;
          userId: string;
        };
      }) => Promise<CreateApiKeyResult>;
    };

    if (!api.createApiKey) {
      return c.json({ error: "NotImplemented", message: "API key plugin method createApiKey is unavailable" }, 501);
    }

    const created = await api.createApiKey({
      body: {
        name: body.name,
        userId: user.id,
      },
    });

    return c.json(
      {
        id: created.id,
        name: created.name ?? body.name,
        key: created.key,
        createdAt: new Date(created.createdAt).toISOString(),
      },
      201,
    );
  });

  // =========================================================================
  // DELETE /api/admin/api-keys/:id
  // =========================================================================
  const deleteRoute = createRoute({
    method: "delete",
    path: "/api/admin/api-keys/:id",
    tags: ["Admin - API Keys"],
    summary: "Revoke an API key",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: "API key deleted",
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "API key not found",
      },
    },
  });

  app.openapi(deleteRoute, async (c: AdminContext) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const id = c.req.param("id");

    const result = await db.execute(sql`
      DELETE FROM apikey
      WHERE id = ${id} AND user_id = ${user.id}
    `);

    const count =
      typeof result === "object" && result !== null && "rowCount" in result && typeof result.rowCount === "number"
        ? result.rowCount
        : 0;

    if (count === 0) {
      return c.json({ error: "NotFound", message: "API key not found" }, 404);
    }

    return c.json({ success: true });
  });
}
