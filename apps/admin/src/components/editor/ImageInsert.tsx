import { useState } from "react";
import type { Editor } from "@tiptap/react";

import type { MediaRecord } from "../../api/media";
import { MediaPicker } from "../media/MediaPicker";

type ImageInsertProps = {
  editor: Editor;
};

export function ImageInsert({ editor }: ImageInsertProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSelect(media: MediaRecord) {
    setPickerOpen(false);

    // Insert image node; src stores the media ID, not the URL.
    // The public URL is used as-is for display in the editor.
    editor
      .chain()
      .focus()
      .setImage({ src: media.id, alt: media.altText ?? media.filename })
      .run();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
      >
        Image
      </button>

      {pickerOpen && (
        <MediaPicker onSelect={handleSelect} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
