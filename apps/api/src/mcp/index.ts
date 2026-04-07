import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import type { AppType } from "../app";
import { resolveMcpAuth } from "./auth";
import { registerAuthenticatedTools } from "./tools/authenticated";
import { registerPublicTools } from "./tools/public";

function createServerDescription() {
  return [
    "Braille documentation MCP server.",
    "Use public tools for search and published reading.",
    "Use authenticated tools for draft editing, publishing, revisions, and navigation operations.",
  ].join(" ");
}

function jsonRpcError(id: unknown, code: number, message: string): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code,
        message,
      },
    },
    { status: 401 },
  );
}

export function registerMcpRoutes(app: AppType) {
  app.all("/mcp", async (c) => {
    let parsedBody: { id?: unknown } | undefined;
    try {
      parsedBody = (await c.req.raw.clone().json()) as { id?: unknown };
    } catch {
      parsedBody = undefined;
    }

    const auth = await resolveMcpAuth(c.req.raw);

    if (auth.status === "invalid") {
      return jsonRpcError(parsedBody?.id, -32001, auth.message);
    }

    const server = new McpServer({
      name: "braille-wiki",
      version: "1.0.0",
      description: createServerDescription(),
    });

    registerPublicTools(server);

    if (auth.status === "authenticated") {
      registerAuthenticatedTools(server, auth.auth);
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    return transport.handleRequest(c.req.raw, {
      parsedBody,
    });
  });
}
