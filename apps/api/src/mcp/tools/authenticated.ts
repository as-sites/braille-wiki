import * as z from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getDocument,
  getRevision,
  getRevisions,
  moveDocument,
  publishDocument,
  reorderChildren,
  rollbackDocument,
  saveDocument,
  unpublishDocument,
} from "../../services";
import type { McpAuthContext } from "../auth";

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

function requireAuth(auth: McpAuthContext | null): McpAuthContext {
  if (!auth) {
    throw new Error("This tool requires a valid API key");
  }

  return auth;
}

export function registerAuthenticatedTools(server: McpServer, auth: McpAuthContext | null) {
  server.registerTool(
    "get_draft",
    {
      description:
        "Load a draft document by UUID, including working ProseMirror JSON and document metadata. Use this before modifying a draft with update_document.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
      },
    },
    async ({ id }) => {
      try {
        requireAuth(auth);
        const result = await getDocument(id);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "update_document",
    {
      description:
        "Save draft edits for a document. Provide full ProseMirror JSON and optional title/description updates. Use this after editing content in an assistant workflow.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
        prosemirror_json: z.record(z.string(), z.unknown()).describe("ProseMirror JSON document"),
        title: z.string().optional().describe("Optional new title"),
        description: z.string().optional().describe("Optional new description"),
      },
    },
    async ({ id, prosemirror_json, title, description }) => {
      try {
        const user = requireAuth(auth);
        const result = await saveDocument(
          id,
          {
            prosemirrorJson: prosemirror_json,
            title,
            description: description ?? undefined,
          },
          user.id,
        );
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "publish_document",
    {
      description:
        "Publish a document draft to the public site workflow. Use this when edits are ready to go live and searchable.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
      },
    },
    async ({ id }) => {
      try {
        const user = requireAuth(auth);
        const result = await publishDocument(id, user.id);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "unpublish_document",
    {
      description:
        "Unpublish a currently published document while retaining draft content for future edits.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
      },
    },
    async ({ id }) => {
      try {
        const user = requireAuth(auth);
        const result = await unpublishDocument(id, user.id);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "get_history",
    {
      description:
        "Retrieve revision history for a document. Use this to inspect prior saves and choose a rollback target.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum revision count"),
      },
    },
    async ({ id, limit }) => {
      try {
        requireAuth(auth);
        const result = await getRevisions(id, { limit });
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "get_revision",
    {
      description:
        "Load one historical revision by revision UUID, including its ProseMirror JSON payload.",
      inputSchema: {
        revision_id: z.string().uuid().describe("Revision UUID"),
      },
    },
    async ({ revision_id }) => {
      try {
        requireAuth(auth);
        const result = await getRevision(revision_id);
        return toToolResult(result.prosemirrorJson);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "rollback_document",
    {
      description:
        "Create a new draft by restoring document content from a selected revision. This does not auto-publish.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
        revision_id: z.string().uuid().describe("Revision UUID to restore from"),
      },
    },
    async ({ id, revision_id }) => {
      try {
        const user = requireAuth(auth);
        const result = await rollbackDocument(id, revision_id, user.id);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "move_document",
    {
      description:
        "Move a document to a new parent path and optionally rename slug. Use this for navigation refactors.",
      inputSchema: {
        id: z.string().uuid().describe("Document UUID"),
        new_parent_path: z.string().min(1).describe("New parent path"),
        new_slug: z.string().optional().describe("Optional new slug"),
      },
    },
    async ({ id, new_parent_path, new_slug }) => {
      try {
        const user = requireAuth(auth);
        const result = await moveDocument(id, new_parent_path, new_slug, user.id);
        return toToolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "reorder_children",
    {
      description:
        "Set explicit sibling order for a parent's children by passing the complete ordered array of child UUIDs.",
      inputSchema: {
        parent_path: z.string().min(1).describe("Parent path whose children are reordered"),
        children: z.array(z.string().uuid()).min(1).describe("Ordered child document UUIDs"),
      },
    },
    async ({ parent_path, children }) => {
      try {
        requireAuth(auth);
        const result = await reorderChildren(parent_path, children);
        return toToolResult({ updated: result.length });
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}
