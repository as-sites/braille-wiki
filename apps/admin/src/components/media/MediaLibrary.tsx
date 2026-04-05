import { useCallback, useEffect, useState } from "react";
import { deleteMedia, listMedia, updateMedia } from "../../api/media";
import type { MediaRecord } from "../../api/media";
import { MediaCard } from "./MediaCard";
import { MediaUpload } from "./MediaUpload";

const PAGE_SIZE = 24;

type MediaLibraryProps = {
  /** When provided, clicking a card calls this instead of opening edit detail */
  onSelect?: (media: MediaRecord) => void;
};

type EditState = {
  media: MediaRecord;
  altText: string;
  filename: string;
  saving: boolean;
  error: string | null;
};

export function MediaLibrary({ onSelect }: MediaLibraryProps) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const load = useCallback(async (nextSearch: string, nextMimeType: string, nextOffset: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await listMedia({
        search: nextSearch || undefined,
        mimeType: nextMimeType || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setItems(result.media);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(search, mimeType, offset);
  }, [load, search, mimeType, offset]);

  function handleUploaded(media: MediaRecord) {
    setItems((prev) => [media, ...prev]);
    setTotal((prev) => prev + 1);
  }

  function handleSelectCard(media: MediaRecord) {
    if (onSelect) {
      onSelect(media);
    } else {
      setEdit({
        media,
        altText: media.altText ?? "",
        filename: media.filename,
        saving: false,
        error: null,
      });
    }
  }

  async function handleSaveEdit() {
    if (!edit) return;

    setEdit((prev) => prev && { ...prev, saving: true, error: null });

    try {
      const updated = await updateMedia(edit.media.id, {
        altText: edit.altText || null,
        filename: edit.filename,
      });

      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEdit(null);
    } catch (err) {
      setEdit((prev) =>
        prev && { ...prev, saving: false, error: err instanceof Error ? err.message : "Save failed" },
      );
    }
  }

  async function handleDelete(media: MediaRecord) {
    const confirmed = window.confirm(
      `Delete "${media.filename}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const result = await deleteMedia(media.id);
      setItems((prev) => prev.filter((m) => m.id !== media.id));
      setTotal((prev) => prev - 1);

      if (result.referenced) {
        alert("Warning: this image was referenced in one or more documents. Those documents may display broken images.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="media-library">
      <MediaUpload onUploaded={handleUploaded} />

      <div className="media-library__filters">
        <input
          type="search"
          placeholder="Search by filename or alt text..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
        />

        <select value={mimeType} onChange={(e) => { setMimeType(e.target.value); setOffset(0); }}>
          <option value="">All types</option>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/gif">GIF</option>
          <option value="image/svg+xml">SVG</option>
          <option value="image/webp">WebP</option>
          <option value="application/pdf">PDF</option>
        </select>
      </div>

      {error && <p className="media-library__error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="media-library__empty">No media found.</p>
      ) : (
        <div className="media-library__grid">
          {items.map((m) => (
            <MediaCard
              key={m.id}
              media={m}
              onSelect={handleSelectCard}
              onEdit={onSelect ? undefined : handleSelectCard}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="media-library__pagination">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      )}

      {edit && (
        <div className="media-detail-overlay" onClick={() => setEdit(null)}>
          <div className="media-detail" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Media</h2>

            {edit.media.mimeType.startsWith("image/") && (
              <img
                src={edit.media.url}
                alt={edit.media.altText ?? edit.media.filename}
                className="media-detail__preview"
              />
            )}

            <label>
              Filename
              <input
                type="text"
                value={edit.filename}
                onChange={(e) => setEdit((prev) => prev && { ...prev, filename: e.target.value })}
              />
            </label>

            <label>
              Alt text
              <input
                type="text"
                value={edit.altText}
                onChange={(e) => setEdit((prev) => prev && { ...prev, altText: e.target.value })}
              />
            </label>

            <p className="media-detail__meta">
              {edit.media.mimeType} · {(edit.media.sizeBytes / 1024).toFixed(1)} KB
              {edit.media.width && edit.media.height
                ? ` · ${edit.media.width}×${edit.media.height}`
                : ""}
            </p>

            {edit.error && <p className="status-error">{edit.error}</p>}

            <div className="media-detail__actions">
              <button type="button" onClick={handleSaveEdit} disabled={edit.saving}>
                {edit.saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEdit(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
