import { useEffect, useMemo } from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";

import { BrailleBlock, getExtensions } from "@braille-docs/editor-schema";

import { BrailleBlockView } from "./BrailleBlockView";
import { Toolbar } from "./Toolbar";

type EditorProps = {
  initialContent: JSONContent;
  onUpdate: (json: JSONContent) => void;
  editable?: boolean;
};

const BrailleBlockWithView = BrailleBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(BrailleBlockView);
  },
});

export function Editor({ initialContent, onUpdate, editable = true }: EditorProps) {
  const extensions = useMemo(
    () =>
      getExtensions().map((extension) => {
        if (extension.name === "brailleBlock") {
          return BrailleBlockWithView;
        }

        return extension;
      }),
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable,
    onUpdate({ editor: currentEditor }) {
      onUpdate(currentEditor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);

  return (
    <div className="editor-root">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
