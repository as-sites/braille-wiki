import { createRoute } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import * as schemas from "../../openapi/schemas";
import * as services from "../../services";
import { ConflictError, ValidationError } from "../../lib/errors";

export function registerAuthInviteRoutes(app: OpenAPIHono) {
  const verifyRoute = createRoute({
    method: "post",
    path: "/api/auth/invite/verify",
    tags: ["Auth - Invites"],
    summary: "Verify invite token",
    request: {
      body: {
        content: {
          "application/json": {
            schema: schemas.VerifyInviteRequest,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Verification result",
        content: {
          "application/json": {
            schema: schemas.VerifyInviteResponse,
          },
        },
      },
      400: { description: "Validation error" },
    },
  });

  app.openapi(verifyRoute, async (c: any) => {
    const body = await c.req.json();

    try {
      const result = await services.verifyInviteToken(body.token);
      return c.json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.name, message: error.message }, 400);
      }
      throw error;
    }
  });

  const acceptRoute = createRoute({
    method: "post",
    path: "/api/auth/invite/accept",
    tags: ["Auth - Invites"],
    summary: "Accept invite and set password",
    request: {
      body: {
        content: {
          "application/json": {
            schema: schemas.AcceptInviteRequest,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Invite accepted",
        content: {
          "application/json": {
            schema: schemas.AcceptInviteResponse,
          },
        },
      },
      400: { description: "Validation error" },
      409: { description: "Conflict" },
    },
  });

  app.openapi(acceptRoute, async (c: any) => {
    const body = await c.req.json();

    try {
      const result = await services.acceptInvite(body);
      return c.json(result);
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
}
