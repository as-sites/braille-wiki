import { registerPublicRoutes } from "./public";
import { registerAdminRoutes } from "./admin";
import { requireAuth, requireAdmin } from "../auth/middleware";

/**
 * Register all application routes.
 */
export function registerRoutes(app: any) {
  // Public routes (no authentication)
  registerPublicRoutes(app);

  // Admin routes (authentication required)
  app.use("/api/admin/*", requireAuth);
  app.use("/api/admin/users*", requireAdmin);
  app.use("/api/admin/api-keys*", requireAdmin);
  
  registerAdminRoutes(app);
}
