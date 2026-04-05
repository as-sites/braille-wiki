import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import * as schemas from "../../openapi/schemas";
import {
  deleteMedia,
  listMedia,
  updateMedia,
  uploadMedia,
} from "../../services/media";

/**
 * Admin media routes (authentication required).
 */

export function registerAdminMediaRoutes(app: OpenAPIHono) {
  // =========================================================================
  // GET /api/admin/media
  // =========================================================================
  const listRoute = createRoute({
    method: "get",
    path: "/api/admin/media",
    tags: ["Admin - Media"],
    summary: "List media files",
    request: {
      query: z.object({
        mimeType: z.string().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().int().positive().max(200).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      }),
    },
    responses: {
      200: {
        description: "Media list",
        content: {
          "application/json": {
            schema: schemas.MediaListResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
    },
  });

  app.openapi(listRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const { mimeType, search, limit, offset } = c.req.valid("query");
    const result = await listMedia({ mimeType, search, limit, offset });

    return c.json(result, 200);
  });

  // =========================================================================
  // POST /api/admin/media
  // =========================================================================
  const uploadRoute = createRoute({
    method: "post",
    path: "/api/admin/media",
    tags: ["Admin - Media"],
    summary: "Upload a media file",
    responses: {
      201: {
        description: "File uploaded",
        content: {
          "application/json": {
            schema: schemas.MediaResponse,
          },
        },
      },
      400: {
        description: "Bad request",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
      413: {
        description: "File too large",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
    },
  });

  app.openapi(uploadRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const altText = formData.get("alt_text") as string | null;

    if (!file) {
      return c.json({ error: "BadRequest", message: "Missing required field: file" }, 400);
    }

    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES) {
      return c.json({ error: "FileTooLarge", message: "File exceeds maximum size of 10 MB" }, 413);
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/svg+xml",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return c.json(
        {
          error: "BadRequest",
          message: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}`,
        },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaRecord = await uploadMedia({
      file: {
        buffer,
        name: file.name,
        type: file.type,
        size: file.size,
      },
      altText: altText ?? undefined,
      userId: user.id,
    });

    return c.json(mediaRecord, 201);
  });

  // =========================================================================
  // PUT /api/admin/media/:id
  // =========================================================================
  const updateRoute = createRoute({
    method: "put",
    path: "/api/admin/media/:id",
    tags: ["Admin - Media"],
    summary: "Update media metadata",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: {
        content: {
          "application/json": {
            schema: schemas.UpdateMediaRequest,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated media record",
        content: {
          "application/json": {
            schema: schemas.MediaResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
      404: {
        description: "Media not found",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
    },
  });

  app.openapi(updateRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const mediaRecord = await updateMedia(id, body);

    return c.json(mediaRecord, 200);
  });

  // =========================================================================
  // DELETE /api/admin/media/:id
  // =========================================================================
  const deleteRoute = createRoute({
    method: "delete",
    path: "/api/admin/media/:id",
    tags: ["Admin - Media"],
    summary: "Delete a media file",
    request: {
      params: z.object({ id: z.string().uuid() }),
    },
    responses: {
      200: {
        description: "Media deleted (may include reference warning)",
        content: {
          "application/json": {
            schema: schemas.DeleteMediaResponse,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
      404: {
        description: "Media not found",
        content: { "application/json": { schema: schemas.ErrorResponse } },
      },
    },
  });

  app.openapi(deleteRoute, async (c: any) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    const { id } = c.req.valid("param");
    const result = await deleteMedia(id);

    return c.json(result, 200);
  });
}
