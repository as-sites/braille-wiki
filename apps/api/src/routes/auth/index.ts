import type { OpenAPIHono } from "@hono/zod-openapi";

import { registerAuthInviteRoutes } from "./invites";

export function registerAuthRoutes(app: OpenAPIHono) {
  registerAuthInviteRoutes(app);
}
