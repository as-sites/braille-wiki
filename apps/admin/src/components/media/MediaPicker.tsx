import type { MediaRecord } from "../../api/media";
import { MediaLibrary } from "./MediaLibrary";

type MediaPickerProps = {
  onSelect: (media: MediaRecord) => void;
  onClose: () => void;
};

export function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  return (
    <div className="media-picker-overlay" onClick={onClose}>
      <div className="media-picker" onClick={(e) => e.stopPropagation()}>
        <div className="media-picker__header">
          <h2>Select Media</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="media-picker__body">
          <MediaLibrary onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
