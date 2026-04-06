import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";

import { APIError } from "./lib/errors";
import type { AuthVariables } from "./auth/middleware";

/**
 * Create the Hono app with global middleware and error handling.
 * Route groups are mounted separately in index.ts.
 */
export function createApp() {
  const app = new OpenAPIHono<{ Variables: AuthVariables }>();

  // ---------------------------------------------------------------------------
  // CORS middleware
  // ---------------------------------------------------------------------------
  app.use(
    "*",
    cors({
      origin: process.env.ADMIN_ORIGIN ?? "http://localhost:5173",
      allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
    }),
  );

  // ---------------------------------------------------------------------------
  // Request logging middleware
  // ---------------------------------------------------------------------------
  app.use("*", logger());

  // ---------------------------------------------------------------------------
  // Global error handler
  // ---------------------------------------------------------------------------
  app.onError((err, c) => {
    // Log the error
    console.error("[Error]", err);

    // Handle APIError (custom business logic errors)
    if (err instanceof APIError) {
      return c.json(
        {
          error: err.name,
          message: err.message,
        },
        err.statusCode as any,
      );
    }

    // Handle Hono's HTTPException
    if (err instanceof HTTPException) {
      return c.json(
        {
          error: err.status,
          message: err.message,
        },
        err.status,
      );
    }

    // Handle validation errors (Zod)
    if (err instanceof Error && err.message.includes("validation")) {
      return c.json(
        {
          error: "ValidationError",
          message: err.message,
        },
        400,
      );
    }

    // Fallback for unhandled errors
    return c.json(
      {
        error: "InternalError",
        message: "Internal server error",
      },
      500,
    );
  });

  // ---------------------------------------------------------------------------
  // 404 handler
  // ---------------------------------------------------------------------------
  app.notFound((c: any) => {
    return c.json(
      {
        error: "NotFound",
        message: "Endpoint not found",
      },
      404,
    );
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
