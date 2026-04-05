import * as z from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getBacklinksForDocument,
  getChildrenForPath,
  getPublishedDocument,
  getTree,
  searchDocuments,
} from "../../services";

function toToolResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: {
      result: data,
    },
  };
}

function toToolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

export function registerPublicTools(server: McpServer) {
  server.registerTool(
    "search_docs",
    {
      description:
        "Search published braille documentation pages by keyword. Use this when a user asks to find docs by topic, concept, or phrase. Optionally scope to a specific work root path (for example, 'nemeth') and limit result count.",
      inputSchema: {
        query: z.string().min(1).describe("Search text query"),
        work: z.string().optional().describe("Optional root path scope"),
        limit: z.number().int().min(1).max(100).optional().describe("Result limit"),
      },
    },
    async ({ query, work, limit }) => {
      try {
        const result = await searchDocuments(query, { work, limit });
        return toToolResult(result.results);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "get_document",
    {
      description:
        "Fetch one published document by canonical path. Use this when you need rendered public content (HTML), metadata, and publish timestamp for a specific page.",
      inputSchema: {
        path: z.string().min(1).describe("Canonical document path, for example 'nemeth/lesson-1'"),
      },
    },
    async ({ path }) => {
      try {
        const result = await getPublishedDocument(path);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "get_children",
    {
      description:
        "List immediate child pages for a path in the published tree. Omit path to list root-level works. Use this for navigation, index pages, or scoped traversal.",
      inputSchema: {
        path: z.string().optional().describe("Parent document path; omit to list root works"),
      },
    },
    async ({ path }) => {
      try {
        const result = await getChildrenForPath(path ?? null);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "get_tree",
    {
      description:
        "Get a nested published sidebar tree under a root work path. Use this to inspect or render the full hierarchy for one work.",
      inputSchema: {
        path: z.string().min(1).describe("Root work path, for example 'nemeth'"),
      },
    },
    async ({ path }) => {
      try {
        const result = await getTree(path);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "get_backlinks",
    {
      description:
        "Find published pages that link to the provided document path. Use this for reference discovery and impact analysis before edits.",
      inputSchema: {
        path: z.string().min(1).describe("Canonical document path"),
      },
    },
    async ({ path }) => {
      try {
        const result = await getBacklinksForDocument(path);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}
