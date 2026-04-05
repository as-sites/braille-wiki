const baseUrl = import.meta.env.VITE_API_URL ?? "";

export type MediaRecord = {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  uploadedBy: string | null;
  createdAt: string;
  url: string;
};

export type MediaListResult = {
  media: MediaRecord[];
  total: number;
  limit: number;
  offset: number;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function listMedia(params: {
  mimeType?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<MediaListResult> {
  const query = new URLSearchParams();

  if (params.mimeType) query.set("mimeType", params.mimeType);
  if (params.search) query.set("search", params.search);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  const res = await fetch(`${baseUrl}/api/admin/media?${query}`, {
    credentials: "include",
  });

  return handleResponse<MediaListResult>(res);
}

export async function uploadMedia(
  file: File,
  altText?: string,
): Promise<MediaRecord> {
  const form = new FormData();
  form.append("file", file);

  if (altText) {
    form.append("alt_text", altText);
  }

  const res = await fetch(`${baseUrl}/api/admin/media`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  return handleResponse<MediaRecord>(res);
}

export async function updateMedia(
  id: string,
  data: { altText?: string | null; filename?: string },
): Promise<MediaRecord> {
  const res = await fetch(`${baseUrl}/api/admin/media/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleResponse<MediaRecord>(res);
}

export async function deleteMedia(id: string): Promise<{ id: string; referenced: boolean }> {
  const res = await fetch(`${baseUrl}/api/admin/media/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse<{ id: string; referenced: boolean }>(res);
}
