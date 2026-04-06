import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import * as schemas from "../../openapi/schemas";
import * as services from "../../services";
import { NotFoundError, ConflictError, ValidationError } from "../../lib/errors";

/**
 * Admin document CRUD routes (authentication required).
 */

export function registerAdminDocumentRoutes(app: OpenAPIHono) {
  // =========================================================================
  // GET /api/admin/documents
  // =========================================================================
  const listRoute = createRoute({
    method: "get",
    path: "/api/admin/documents",
    tags: ["Admin - Documents"],
    summary: "List all documents",
    request: {
      query: z.object({
        status: schemas.DocumentStatus.optional(),
        search: z.string().optional(),
        parentPath: z.string().optional(),
        limit: z.coerce.number().int().positive().optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      }),
    },
    responses: {
      200: {
        description: "Document list",
        content: {
          "application/json": {
            schema: schemas.DocumentListResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
    },
  });

  app.openapi(listRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const status = c.req.query("status") as any;
    const search = c.req.query("search");
    const parentPath = c.req.query("parentPath");

    const documents = await services.getDocuments({
      status,
      search: search || undefined,
      parentPath: parentPath || undefined,
    });

    return c.json({
      documents,
      total: documents.length,
      limit: 100,
      offset: 0,
    });
  });

  // =========================================================================
  // POST /api/admin/documents
  // =========================================================================
  const createRoute_ = createRoute({
    method: "post",
    path: "/api/admin/documents",
    tags: ["Admin - Documents"],
    summary: "Create a new document",
    request: {
      body: {
        content: {
          "application/json": {
            schema: schemas.CreateDocumentRequest,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Document created",
        content: {
          "application/json": {
            schema: schemas.DocumentResponse,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
      409: {
        description: "Conflict - path already exists",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
    },
  });

  app.openapi(createRoute_, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const body = await c.req.json();

    try {
      const document = await services.createDocument(
        {
          title: body.title,
          slug: body.slug,
          parentPath: body.parentPath,
          description: body.description,
        },
        user.id,
      );

      return c.json(document, 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.name, message: error.message }, 400);
      }
      if (error instanceof ConflictError) {
        return c.json({ error: error.name, message: error.message }, 409);
      }
      throw error;
    }
  });

  // =========================================================================
  // GET /api/admin/documents/:id
  // =========================================================================
  const getRoute = createRoute({
    method: "get",
    path: "/api/admin/documents/:id",
    tags: ["Admin - Documents"],
    summary: "Get a document by ID",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Document found",
        content: {
          "application/json": {
            schema: schemas.DocumentResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
      404: {
        description: "Document not found",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
    },
  });

  app.openapi(getRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    try {
      const id = c.req.param("id");
      const document = await services.getDocument(id);
      return c.json(document);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.name, message: error.message }, 404);
      }
      throw error;
    }
  });

  // =========================================================================
  // PUT /api/admin/documents/:id
  // =========================================================================
  const updateRoute = createRoute({
    method: "put",
    path: "/api/admin/documents/:id",
    tags: ["Admin - Documents"],
    summary: "Save document draft",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: schemas.UpdateDocumentRequest,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Document updated",
        content: {
          "application/json": {
            schema: schemas.DocumentResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Document not found",
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
      const document = await services.saveDocument(id, body, user.id);
      return c.json(document);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.name, message: error.message }, 404);
      }
      throw error;
    }
  });

  // =========================================================================
  // DELETE /api/admin/documents/:id
  // =========================================================================
  const deleteRoute = createRoute({
    method: "delete",
    path: "/api/admin/documents/:id",
    tags: ["Admin - Documents"],
    summary: "Archive a document",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Document archived",
        content: {
          "application/json": {
            schema: schemas.DocumentResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Document not found",
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
      const document = await services.archiveDocument(id, user.id);
      return c.json(document);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.name, message: error.message }, 404);
      }
      throw error;
    }
  });
}
