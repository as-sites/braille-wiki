import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import * as schemas from "../../openapi/schemas";
import * as services from "../../services";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "../../lib/errors";

/**
 * Admin user management routes (admin role required).
 */

export function registerAdminUserRoutes(app: OpenAPIHono) {
  // =========================================================================
  // GET /api/admin/users
  // =========================================================================
  const listRoute = createRoute({
    method: "get",
    path: "/api/admin/users",
    tags: ["Admin - Users"],
    summary: "List all users",
    responses: {
      200: {
        description: "Users list",
        content: {
          "application/json": {
            schema: schemas.UserListResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Forbidden - admin role required",
      },
      409: {
        description: "Conflict",
      },
    },
  });

  app.openapi(listRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    if (user.role !== "admin") {
      return c.json({ error: "Forbidden", message: "Admin role required" }, 403);
    }

    const users = await services.getUsers();
    return c.json(users);
  });

  // =========================================================================
  // POST /api/admin/users
  // =========================================================================
  const createRoute_ = createRoute({
    method: "post",
    path: "/api/admin/users",
    tags: ["Admin - Users"],
    summary: "Create a new user",
    request: {
      body: {
        content: {
          "application/json": {
            schema: schemas.CreateUserRequest,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User created",
        content: {
          "application/json": {
            schema: schemas.UserResponse,
          },
        },
      },
      400: {
        description: "Bad request",
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Forbidden - admin role required",
      },
    },
  });

  app.openapi(createRoute_, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    if (user.role !== "admin") {
      return c.json({ error: "Forbidden", message: "Admin role required" }, 403);
    }

    const body = await c.req.json();

    try {
      const newUser = await services.createUser(body, user.role);
      return c.json(newUser, 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.name, message: error.message }, 400);
      }
      if (error instanceof ForbiddenError) {
        return c.json({ error: error.name, message: error.message }, 403);
      }
      if (error instanceof ConflictError) {
        return c.json({ error: error.name, message: error.message }, 409);
      }
      throw error;
    }
  });

  // =========================================================================
  // PUT /api/admin/users/:id
  // =========================================================================
  const updateRoute = createRoute({
    method: "put",
    path: "/api/admin/users/:id",
    tags: ["Admin - Users"],
    summary: "Update a user",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: schemas.UpdateUserRequest,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User updated",
        content: {
          "application/json": {
            schema: schemas.UserResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Forbidden",
      },
      404: {
        description: "User not found",
      },
    },
  });

  app.openapi(updateRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const id = c.req.param("id");
    const body = await c.req.json();

    try {
      const updated = await services.updateUser(id, body, user);
      return c.json(updated);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return c.json({ error: error.name, message: error.message }, 403);
      }
      if (error instanceof NotFoundError) {
        return c.json({ error: error.name, message: error.message }, 404);
      }
      throw error;
    }
  });

  // =========================================================================
  // DELETE /api/admin/users/:id
  // =========================================================================
  const deleteRoute = createRoute({
    method: "delete",
    path: "/api/admin/users/:id",
    tags: ["Admin - Users"],
    summary: "Delete a user",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "User deleted",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Forbidden",
      },
      404: {
        description: "User not found",
      },
    },
  });

  app.openapi(deleteRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const id = c.req.param("id");

    try {
      await services.deleteUser(id, user);
      return c.json({ success: true });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return c.json({ error: error.name, message: error.message }, 403);
      }
      if (error instanceof NotFoundError) {
        return c.json({ error: error.name, message: error.message }, 404);
      }
      throw error;
    }
  });
}
