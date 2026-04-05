import { defineMiddleware } from "astro:middleware";
import { getPublishedDocument } from "./lib/db";

// Patterns where we never do a DB document lookup
const SKIP_PREFIXES = ["/internal/", "/_"];
const SKIP_EXTENSIONS = /\.[a-z0-9]+$/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Home page has its own index.astro
  if (pathname === "/") return next();

  // Skip internal routes, Astro internals, and static assets
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return next();
  if (SKIP_EXTENSIONS.test(pathname)) return next();

  // Prevent rewrite loops: /render is the target, skip it
  if (pathname === "/render") return next();

  const requestedPath = pathname
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .join("/");

  if (!requestedPath) return next();

  context.locals.requestedPath = requestedPath;
  context.locals.dbDocument =
    (await getPublishedDocument(requestedPath)) ?? undefined;

  return context.rewrite("/render");
});
