import type { MediaRecord } from "../../api/media";

type MediaCardProps = {
  media: MediaRecord;
  onSelect?: (media: MediaRecord) => void;
  onDelete?: (media: MediaRecord) => void;
  onEdit?: (media: MediaRecord) => void;
  selected?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaCard({ media, onSelect, onDelete, onEdit, selected }: MediaCardProps) {
  const isImage = media.mimeType.startsWith("image/");

  return (
    <div
      className={`media-card${selected ? " media-card--selected" : ""}`}
      onClick={() => onSelect?.(media)}
    >
      <div className="media-card__thumb">
        {isImage ? (
          <img src={media.url} alt={media.altText ?? media.filename} />
        ) : (
          <div className="media-card__thumb-placeholder">PDF</div>
        )}
      </div>

      <div className="media-card__info">
        <p className="media-card__filename" title={media.filename}>
          {media.filename}
        </p>
        <p className="media-card__meta">
          {formatBytes(media.sizeBytes)}
          {media.width && media.height ? ` · ${media.width}×${media.height}` : ""}
        </p>
        {media.altText ? (
          <p className="media-card__alt" title={media.altText}>
            Alt: {media.altText}
          </p>
        ) : null}
      </div>

      {(onEdit || onDelete) && (
        <div className="media-card__actions">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(media); }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(media); }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
