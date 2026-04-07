import { createRoute, z } from "@hono/zod-openapi";

import * as schemas from "../../openapi/schemas";
import * as services from "../../services";
import { NotFoundError } from "../../lib/errors";

/**
 * Public document routes (no authentication required).
 * GET endpoints for published documents, tree navigation, and backlinks.
 */

export function registerPublicDocumentRoutes(app: any) {
  // =========================================================================
  // GET /api/documents/:path
  // =========================================================================
  const getDocumentRoute = createRoute({
    method: "get",
    path: "/api/documents/:path{/*}",
    tags: ["Documents"],
    summary: "Get a published document by path",
    request: {
      params: z.object({
        path: z.string().describe("Document path (can contain slashes)"),
      }),
    },
    responses: {
      200: {
        description: "Document found",
        content: {
          "application/json": {
            schema: schemas.PublicDocumentResponse,
          },
        },
      },
      404: {
        description: "Document not found or not published",
        content: {
          "application/json": {
            schema: schemas.ErrorResponse,
          },
        },
      },
    },
  });

  app.openapi(getDocumentRoute, async (c: any) => {
    try {
      const path = c.req.param("path");
      const document = await services.getPublishedDocument(path);

      return c.json({
        path: document.path,
        title: document.title,
        description: document.description,
        renderedHtml: document.renderedHtml || "",
        publishedAt: document.publishedAt?.toISOString() || new Date().toISOString(),
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return c.json(
          { error: error.name, message: error.message },
          404,
        );
      }
      throw error;
    }
  });

  // =========================================================================
  // GET /api/documents/:path/children
  // =========================================================================
  const getChildrenRoute = createRoute({
    method: "get",
    path: "/api/documents/:path{/*}/children",
    tags: ["Documents"],
    summary: "Get immediate children of a document",
    request: {
      params: z.object({
        path: z.string().optional().describe("Parent path (omit for root)"),
      }),
    },
    responses: {
      200: {
        description: "Children list",
        content: {
          "application/json": {
            schema: schemas.PublicChildrenResponse,
          },
        },
      },
      404: {
        description: "Parent not found",
      },
    },
  });

  app.openapi(getChildrenRoute, async (c: any) => {
    const path = c.req.param("path");
    const parentPath = path && path.trim() ? path : null;

    const children = await services.getChildrenForPath(parentPath);

    return c.json(
      children.map((child) => ({
        path: child.path,
        title: child.title,
        description: child.description,
        position: child.position,
      })),
    );
  });

  // =========================================================================
  // GET /api/documents/:path/tree
  // =========================================================================
  const getTreeRoute = createRoute({
    method: "get",
    path: "/api/documents/:path{/*}/tree",
    tags: ["Documents"],
    summary: "Get the full tree hierarchy starting from a root work",
    request: {
      params: z.object({
        path: z.string().describe("Root work path (e.g., 'nemeth')"),
      }),
    },
    responses: {
      200: {
        description: "Tree structure",
        content: {
          "application/json": {
            schema: schemas.TreeResponse,
          },
        },
      },
      404: {
        description: "Root path not found",
      },
    },
  });

  app.openapi(getTreeRoute, async (c: any) => {
    try {
      const path = c.req.param("path");
      const tree = await services.getTree(path);
      return c.json(tree[0] || {});
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return c.json(
          { error: error.name, message: error.message },
          404,
        );
      }
      throw error;
    }
  });

  // =========================================================================
  // GET /api/documents/:path/backlinks
  // =========================================================================
  const getBacklinksRoute = createRoute({
    method: "get",
    path: "/api/documents/:path{/*}/backlinks",
    tags: ["Documents"],
    summary: "Get pages that link to this document",
    request: {
      params: z.object({
        path: z.string().describe("Document path"),
      }),
    },
    responses: {
      200: {
        description: "Backlinks",
        content: {
          "application/json": {
            schema: schemas.BacklinksResponse,
          },
        },
      },
    },
  });

  app.openapi(getBacklinksRoute, async (c: any) => {
    const path = c.req.param("path");
    const backlinks = await services.getBacklinksForDocument(path);

    return c.json(
      backlinks.map((link) => ({
        path: link.path,
        title: link.title,
      })),
    );
  });
}
