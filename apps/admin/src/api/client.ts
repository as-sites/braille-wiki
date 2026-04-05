import createClient from "openapi-fetch";

import type { paths } from "./generated/api";

type AnyRecord = Record<string, unknown>;

export type AdminDocument = {
  id: string;
  path: string;
  slug: string;
  title: string;
  description: string | null;
  metadata: AnyRecord | null;
  status: "draft" | "published" | "archived";
  prosemirrorJson: AnyRecord | null;
  publishedProsemirrorJson: AnyRecord | null;
  updatedAt: string;
  publishedAt: string | null;
};

const baseUrl = import.meta.env.VITE_API_URL ?? "";

const client = createClient<paths>({
  baseUrl,
  credentials: "include",
});

function toDocument(value: unknown): AdminDocument {
  const doc = (value ?? {}) as AnyRecord;

  return {
    id: String(doc.id ?? ""),
    path: String(doc.path ?? ""),
    slug: String(doc.slug ?? ""),
    title: String(doc.title ?? ""),
    description: (doc.description as string | null | undefined) ?? null,
    metadata: (doc.metadata as AnyRecord | null | undefined) ?? null,
    status: (doc.status as AdminDocument["status"]) ?? "draft",
    prosemirrorJson:
      (doc.prosemirrorJson as AnyRecord | null | undefined) ??
      (doc.prosemirror_json as AnyRecord | null | undefined) ??
      null,
    publishedProsemirrorJson:
      (doc.publishedProsemirrorJson as AnyRecord | null | undefined) ??
      (doc.published_prosemirror_json as AnyRecord | null | undefined) ??
      null,
    updatedAt: String(doc.updatedAt ?? doc.updated_at ?? ""),
    publishedAt: (doc.publishedAt as string | null | undefined) ?? (doc.published_at as string | null | undefined) ?? null,
  };
}

async function unwrap<T>(result: { data?: T; error?: unknown }) {
  if (result.error) {
    throw new Error("API request failed");
  }

  if (typeof result.data === "undefined") {
    throw new Error("Missing API response data");
  }

  return result.data;
}

export async function getDocument(id: string): Promise<AdminDocument> {
  const data = await unwrap(
    await client.GET("/api/admin/documents/{id}", {
      params: { path: { id } },
    }),
  );

  return toDocument(data);
}

export async function saveDocument(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    metadata?: AnyRecord | null;
    prosemirrorJson: AnyRecord;
  },
): Promise<AdminDocument> {
  const data = await unwrap(
    await client.PUT("/api/admin/documents/{id}", {
      params: { path: { id } },
      body: {
        title: payload.title,
        description: payload.description,
        metadata: payload.metadata ?? undefined,
        prosemirrorJson: payload.prosemirrorJson,
      } as never,
    }),
  );

  return toDocument(data);
}

export async function publishDocument(id: string): Promise<AdminDocument> {
  const data = await unwrap(
    await client.POST("/api/admin/documents/{id}/publish", {
      params: { path: { id } },
      body: {} as never,
    }),
  );

  return toDocument(data);
}
