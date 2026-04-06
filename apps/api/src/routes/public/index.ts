import { registerPublicDocumentRoutes } from "./documents";
import { registerPublicSearchRoutes } from "./search";

/**
 * Register all public routes (no authentication required).
 */
export function registerPublicRoutes(app: any) {
  registerPublicDocumentRoutes(app);
  registerPublicSearchRoutes(app);
}
