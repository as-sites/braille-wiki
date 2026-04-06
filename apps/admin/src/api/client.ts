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

export type AdminDocumentSummary = {
  id: string;
  path: string;
  title: string;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  publishedAt: string | null;
};

export type AdminRevision = {
  id: string;
  action: "save" | "publish" | "rollback";
  createdBy: string | null;
  createdAt: string;
};

export type AdminRevisionDetail = AdminRevision & {
  prosemirrorJson: AnyRecord;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
  createdAt: string;
};

export type AdminUserInvite = {
  id: string;
  userId: string;
  email: string;
  role: "admin" | "editor";
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type InviteVerifyResult = {
  valid: boolean;
  status: "pending" | "accepted" | "revoked" | "expired" | "invalid";
  emailMasked: string | null;
  expiresAt: string | null;
};

export type AdminApiKey = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type AdminApiKeyCreated = AdminApiKey & {
  key: string;
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

function toDocumentSummary(value: unknown): AdminDocumentSummary {
  const doc = (value ?? {}) as AnyRecord;

  return {
    id: String(doc.id ?? ""),
    path: String(doc.path ?? ""),
    title: String(doc.title ?? ""),
    status: (doc.status as AdminDocumentSummary["status"]) ?? "draft",
    updatedAt: String(doc.updated_at ?? doc.updatedAt ?? ""),
    publishedAt: (doc.published_at as string | null | undefined) ?? (doc.publishedAt as string | null | undefined) ?? null,
  };
}

function toRevision(value: unknown): AdminRevision {
  const revision = (value ?? {}) as AnyRecord;

  return {
    id: String(revision.id ?? ""),
    action: (revision.action as AdminRevision["action"]) ?? "save",
    createdBy:
      (revision.created_by as string | null | undefined) ??
      (revision.createdBy as string | null | undefined) ??
      null,
    createdAt: String(revision.created_at ?? revision.createdAt ?? ""),
  };
}

function toRevisionDetail(value: unknown): AdminRevisionDetail {
  const revision = (value ?? {}) as AnyRecord;

  return {
    ...toRevision(value),
    prosemirrorJson:
      (revision.prosemirror_json as AnyRecord | null | undefined) ??
      (revision.prosemirrorJson as AnyRecord | null | undefined) ??
      {},
  };
}

function toUser(value: unknown): AdminUser {
  const user = (value ?? {}) as AnyRecord;

  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    role: (user.role as AdminUser["role"]) ?? "editor",
    createdAt: String(user.created_at ?? user.createdAt ?? ""),
  };
}

function toApiKey(value: unknown): AdminApiKey {
  const key = (value ?? {}) as AnyRecord;

  return {
    id: String(key.id ?? ""),
    name: String(key.name ?? ""),
    createdAt: String(key.created_at ?? key.createdAt ?? ""),
    lastUsedAt: (key.last_used_at as string | null | undefined) ?? (key.lastUsedAt as string | null | undefined) ?? null,
  };
}

function toUserInvite(value: unknown): AdminUserInvite {
  const invite = (value ?? {}) as AnyRecord;

  return {
    id: String(invite.id ?? ""),
    userId: String(invite.user_id ?? invite.userId ?? ""),
    email: String(invite.email ?? ""),
    role: (invite.role as AdminUserInvite["role"]) ?? "editor",
    status: (invite.status as AdminUserInvite["status"]) ?? "pending",
    expiresAt: String(invite.expires_at ?? invite.expiresAt ?? ""),
    acceptedAt:
      (invite.accepted_at as string | null | undefined) ??
      (invite.acceptedAt as string | null | undefined) ??
      null,
    revokedAt:
      (invite.revoked_at as string | null | undefined) ??
      (invite.revokedAt as string | null | undefined) ??
      null,
    createdBy: String(invite.created_by ?? invite.createdBy ?? ""),
    createdAt: String(invite.created_at ?? invite.createdAt ?? ""),
    updatedAt: String(invite.updated_at ?? invite.updatedAt ?? ""),
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

export async function listDocuments(filters?: {
  status?: "draft" | "published" | "archived";
  search?: string;
  parentPath?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminDocumentSummary[]; total: number }> {
  const data = await unwrap(
    await client.GET("/api/admin/documents", {
      params: {
        query: {
          status: filters?.status,
          search: filters?.search,
          parent_path: filters?.parentPath,
          limit: filters?.limit,
          offset: filters?.offset,
        },
      },
    }),
  );

  const payload = data as { items?: unknown[]; total?: number };

  return {
    items: (payload.items ?? []).map(toDocumentSummary),
    total: Number(payload.total ?? 0),
  };
}

export async function createDocument(payload: {
  title: string;
  parentPath: string;
  slug: string;
}): Promise<AdminDocument> {
  const data = await unwrap(
    await client.POST("/api/admin/documents", {
      body: {
        title: payload.title,
        parent_path: payload.parentPath,
        slug: payload.slug,
      } as never,
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
        prosemirror_json: payload.prosemirrorJson,
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

export async function archiveDocument(id: string): Promise<AdminDocument> {
  const data = await unwrap(
    await client.DELETE("/api/admin/documents/{id}", {
      params: { path: { id } },
    }),
  );

  return toDocument(data);
}

export async function reorderChildren(payload: {
  parentPath: string;
  children: string[];
}): Promise<void> {
  await unwrap(
    await client.PUT("/api/admin/documents/reorder", {
      body: {
        parent_path: payload.parentPath,
        children: payload.children,
      } as never,
    }),
  );
}

export async function listRevisions(
  id: string,
  paging?: { limit?: number; offset?: number },
): Promise<{ items: AdminRevision[]; total: number }> {
  const data = await unwrap(
    await client.GET("/api/admin/documents/{id}/revisions", {
      params: {
        path: { id },
        query: {
          limit: paging?.limit,
          offset: paging?.offset,
        },
      },
    }),
  );

  const payload = data as { items?: unknown[]; total?: number };

  return {
    items: (payload.items ?? []).map(toRevision),
    total: Number(payload.total ?? 0),
  };
}

export async function getRevision(revisionId: string): Promise<AdminRevisionDetail> {
  const data = await unwrap(
    await client.GET("/api/admin/revisions/{revisionId}", {
      params: { path: { revisionId } },
    }),
  );

  return toRevisionDetail(data);
}

export async function rollbackDocument(id: string, revisionId: string): Promise<AdminDocument> {
  const data = await unwrap(
    await client.POST("/api/admin/documents/{id}/rollback/{revisionId}", {
      params: { path: { id, revisionId } },
      body: {} as never,
    }),
  );

  return toDocument(data);
}

export async function listUsers(): Promise<AdminUser[]> {
  const data = await unwrap(await client.GET("/api/admin/users"));
  return ((data as unknown[]) ?? []).map(toUser);
}

export async function createUser(payload: {
  name: string;
  email: string;
  role: "admin" | "editor";
}): Promise<AdminUser> {
  const data = await unwrap(
    await client.POST("/api/admin/users", {
      body: payload as never,
    }),
  );

  return toUser(data);
}

export async function updateUser(
  id: string,
  payload: { name?: string; role?: "admin" | "editor" },
): Promise<AdminUser> {
  const data = await unwrap(
    await client.PUT("/api/admin/users/{id}", {
      params: { path: { id } },
      body: payload as never,
    }),
  );

  return toUser(data);
}

export async function deleteUser(id: string): Promise<void> {
  await unwrap(
    await client.DELETE("/api/admin/users/{id}", {
      params: { path: { id } },
    }),
  );
}

export async function listApiKeys(): Promise<AdminApiKey[]> {
  const data = await unwrap(await client.GET("/api/admin/api-keys"));
  return ((data as unknown[]) ?? []).map(toApiKey);
}

export async function listUserInvites(): Promise<AdminUserInvite[]> {
  const data = await unwrap(await client.GET("/api/admin/users/invites"));
  return ((data as unknown[]) ?? []).map(toUserInvite);
}

export async function createUserInvite(payload: {
  name: string;
  email: string;
  role: "admin" | "editor";
}): Promise<AdminUserInvite> {
  const data = await unwrap(
    await client.POST("/api/admin/users/invites", {
      body: payload as never,
    }),
  );

  return toUserInvite(data);
}

export async function resendUserInvite(id: string): Promise<AdminUserInvite> {
  const data = await unwrap(
    await client.POST("/api/admin/users/invites/{id}/resend", {
      params: { path: { id } },
      body: {} as never,
    }),
  );

  return toUserInvite(data);
}

export async function revokeUserInvite(id: string): Promise<AdminUserInvite> {
  const data = await unwrap(
    await client.POST("/api/admin/users/invites/{id}/revoke", {
      params: { path: { id } },
      body: {} as never,
    }),
  );

  return toUserInvite(data);
}

export async function verifyInviteToken(token: string): Promise<InviteVerifyResult> {
  const data = await unwrap(
    await client.POST("/api/auth/invite/verify", {
      body: { token } as never,
    }),
  );

  const payload = data as AnyRecord;
  return {
    valid: Boolean(payload.valid),
    status: (payload.status as InviteVerifyResult["status"]) ?? "invalid",
    emailMasked:
      (payload.email_masked as string | null | undefined) ??
      (payload.emailMasked as string | null | undefined) ??
      null,
    expiresAt:
      (payload.expires_at as string | null | undefined) ??
      (payload.expiresAt as string | null | undefined) ??
      null,
  };
}

export async function acceptInvite(payload: {
  token: string;
  password: string;
  name?: string;
}): Promise<{ success: boolean; user: AdminUser }> {
  const data = await unwrap(
    await client.POST("/api/auth/invite/accept", {
      body: payload as never,
    }),
  );

  const value = (data ?? {}) as AnyRecord;
  return {
    success: Boolean(value.success),
    user: toUser(value.user),
  };
}

export async function createApiKey(name: string): Promise<AdminApiKeyCreated> {
  const data = await unwrap(
    await client.POST("/api/admin/api-keys", {
      body: { name } as never,
    }),
  );

  const value = (data ?? {}) as AnyRecord;
  return {
    ...toApiKey(value),
    key: String(value.key ?? ""),
  };
}

export async function revokeApiKey(id: string): Promise<void> {
  await unwrap(
    await client.DELETE("/api/admin/api-keys/{id}", {
      params: { path: { id } },
    }),
  );
}
