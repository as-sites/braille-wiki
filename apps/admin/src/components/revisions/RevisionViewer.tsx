import type { JSONContent } from "@tiptap/react";

import { Editor } from "../editor/Editor";

type RevisionViewerProps = {
  content: JSONContent;
};

export function RevisionViewer({ content }: RevisionViewerProps) {
  return (
    <div className="card">
      <h2>Revision content</h2>
      <Editor initialContent={content} onUpdate={() => {}} editable={false} />
    </div>
  );
}
