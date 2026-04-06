import { registerAdminDocumentRoutes } from "./documents";
import { registerAdminRevisionRoutes } from "./revisions";
import { registerAdminPublishingRoutes } from "./publishing";
import { registerAdminNavigationRoutes } from "./navigation";
import { registerAdminUserRoutes } from "./users";
import { registerAdminMediaRoutes } from "./media";
import { registerAdminAPIKeyRoutes } from "./api-keys";

/**
 * Register all admin routes (authentication required).
 */
export function registerAdminRoutes(app: any) {
  registerAdminDocumentRoutes(app);
  registerAdminRevisionRoutes(app);
  registerAdminPublishingRoutes(app);
  registerAdminNavigationRoutes(app);
  registerAdminUserRoutes(app);
  registerAdminMediaRoutes(app);
  registerAdminAPIKeyRoutes(app);
}
