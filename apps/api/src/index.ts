import "dotenv/config";
import { serve } from "@hono/node-server";
import { auth } from "./auth/index";
import { createApp } from "./app";
import { buildIndex } from "./lib/search-index";
import { registerMcpRoutes } from "./mcp";
import { registerRoutes } from "./routes";
import { seedAdmin } from "./seed";

// ---------------------------------------------------------------------------
// Create the Hono app with global middleware
// ---------------------------------------------------------------------------
const app = createApp();

// ---------------------------------------------------------------------------
// Auth routes — better-auth manages /api/auth/* sub-routes
// ---------------------------------------------------------------------------
app.on(["GET", "POST"], "/api/auth/*", (c: any) => {
  return auth.handler(c.req.raw);
});

// ---------------------------------------------------------------------------
// Register all public and admin routes
// ---------------------------------------------------------------------------
registerRoutes(app);
registerMcpRoutes(app);

// ---------------------------------------------------------------------------
// OpenAPI route — serve the generated OpenAPI spec
// ---------------------------------------------------------------------------
app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Braille Wiki API",
    version: "1.0.0",
  },
  servers: [
    {
      url: "/api",
      description: "API server",
    },
  ],
});

export { app };

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

serve({ fetch: app.fetch, port: PORT, hostname: HOST }, async (info) => {
  console.log(`[api] Listening on http://${HOST}:${info.port}`);
  console.log(`[api] OpenAPI docs: http://${HOST}:${info.port}/api/openapi.json`);

  void buildIndex()
    .then(() => {
      console.log("[api] Search index ready");
    })
    .catch((error) => {
      console.error("[api] Search index build failed", error);
    });

  await seedAdmin();
});
