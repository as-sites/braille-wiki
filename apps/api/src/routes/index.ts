import { registerPublicRoutes } from "./public";
import { registerAdminRoutes } from "./admin";
import { registerAuthRoutes } from "./auth";
import { requireAuth, requireAdmin } from "../auth/middleware";

/**
 * Register all application routes.
 */
export function registerRoutes(app: any) {
  // Public routes (no authentication)
  registerPublicRoutes(app);

  // Custom auth routes that coexist with better-auth handlers
  registerAuthRoutes(app);

  // Admin routes (authentication required)
  app.use("/api/admin/*", requireAuth);
  app.use("/api/admin/users*", requireAdmin);
  app.use("/api/admin/api-keys*", requireAdmin);
  
  registerAdminRoutes(app);
}
