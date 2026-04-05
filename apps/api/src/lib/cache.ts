/**
 * Invalidate Astro cache tags.
 *
 * Calls POST /internal/cache/invalidate on the Astro app.
 * Fails gracefully — a missing or unreachable Astro app is logged but not fatal.
 */
export async function invalidateCacheTags(tags: string[]): Promise<void> {
  const astroUrl = process.env["ASTRO_INTERNAL_URL"];
  const secret = process.env["INTERNAL_SECRET"];

  if (!astroUrl || !secret) {
    return;
  }

  try {
    const response = await fetch(`${astroUrl}/internal/cache/invalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[api] Cache invalidation responded ${response.status} for tags: ${tags.join(", ")}`);
    }
  } catch (err) {
    console.warn(`[api] Cache invalidation failed (Astro unreachable?):`, err);
  }
}

export function docCacheTag(path: string): string {
  return `doc:${path}`;
}
