import { db, sql } from "@braille-docs/db";

import { auth } from "../auth";

export type McpAuthContext = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type McpAuthResolution =
  | { status: "public"; auth: null }
  | { status: "authenticated"; auth: McpAuthContext }
  | { status: "invalid"; message: string };

function getApiKeyFromRequest(req: Request): string | null {
  const key = req.headers.get("x-api-key")?.trim();
  return key && key.length > 0 ? key : null;
}

export async function resolveMcpAuth(req: Request): Promise<McpAuthResolution> {
  const key = getApiKeyFromRequest(req);

  if (!key) {
    return { status: "public", auth: null };
  }

  try {
    const authApi = auth.api as {
      validateApiKey?: (args: {
        headers?: Headers;
        body?: { key: string };
      }) => Promise<{ valid: boolean; key?: { referenceId?: string } }>;
      verifyApiKey?: (args: {
        body: { key: string };
      }) => Promise<{ valid: boolean; key?: { referenceId?: string } }>;
    };

    const validation = authApi.validateApiKey
      ? await authApi.validateApiKey({ headers: req.headers, body: { key } })
      : await authApi.verifyApiKey?.({ body: { key } });

    if (!validation?.valid || !validation.key?.referenceId) {
      return { status: "invalid", message: "Invalid API key" };
    }

    const userId = validation.key.referenceId;

    const rows = await db.execute<{
      id: string;
      email: string;
      name: string;
      role: string | null;
    }>(sql`SELECT id, email, name, role FROM "user" WHERE id = ${userId} LIMIT 1`);

    const userRows = Array.isArray(rows)
      ? rows
      : ((rows as { rows?: Array<{ id: string; email: string; name: string; role: string | null }> }).rows ?? []);
    const user = userRows[0];

    if (!user) {
      return { status: "invalid", message: "API key user not found" };
    }

    return {
      status: "authenticated",
      auth: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role ?? "editor",
      },
    };
  } catch {
    return { status: "invalid", message: "Failed to validate API key" };
  }
}
