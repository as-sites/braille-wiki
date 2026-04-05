import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ cache, request }) => {
  const configuredSecret = import.meta.env.INTERNAL_SECRET;
  const providedSecret = request.headers.get("x-internal-secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return Response.json(
      {
        error: "Unauthorized",
        message: "The supplied internal secret is invalid.",
      },
      {
        status: 401,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: "BadRequest",
        message: "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  const tags = Array.isArray((payload as { tags?: unknown }).tags)
    ? (payload as { tags: unknown[] }).tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean)
    : [];

  if (tags.length === 0) {
    return Response.json(
      {
        error: "BadRequest",
        message: "Body must include a non-empty `tags` array.",
      },
      {
        status: 400,
      },
    );
  }

  await cache.invalidate({
    tags,
  });

  return Response.json({
    cacheEnabled: cache.enabled,
    invalidated: tags,
    ok: true,
  });
};
