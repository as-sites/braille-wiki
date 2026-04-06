import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, EditorContext, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";

// --- Custom Extensions ---
import { BrailleBlock, getExtensions } from "@braille-wiki/editor-schema";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Typography } from "@tiptap/extension-typography";

// --- Tiptap UI Primitives ---
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap UI Components ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { Button as TiptapButton } from "@/components/tiptap-ui-primitive/button";

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Node Styles ---
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Editor Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

// --- Custom Components ---
import { BrailleBlockView } from "./BrailleBlockView";
import { ImageInsert } from "./ImageInsert";

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
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">("main");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const extensions = useMemo(() => {
    // Start from our base extensions (StarterKit + BrailleBlock + Link + Image + TextAlign + Underline + Placeholder)
    const base = getExtensions().map((ext) => {
      if (ext.name === "brailleBlock") return BrailleBlockWithView;
      return ext;
    });

    // Add simple editor extras that aren't duplicated
    return [
      ...base,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Superscript,
      Subscript,
      Selection,
    ];
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    onUpdate({ editor: currentEditor }) {
      onUpdate(currentEditor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") setMobileView("main");
  }, [isMobile, mobileView]);

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        {editable && (
          <Toolbar
            ref={toolbarRef}
            style={
              isMobile
                ? { bottom: `calc(100% - ${height - rect.y}px)` }
                : {}
            }
          >
            {mobileView === "main" ? (
              <>
                <Spacer />

                <ToolbarGroup>
                  <UndoRedoButton action="undo" />
                  <UndoRedoButton action="redo" />
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                  <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
                  <ListDropdownMenu
                    modal={false}
                    types={["bulletList", "orderedList", "taskList"]}
                  />
                  <BlockquoteButton />
                  <CodeBlockButton />
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                  <MarkButton type="bold" />
                  <MarkButton type="italic" />
                  <MarkButton type="strike" />
                  <MarkButton type="code" />
                  <MarkButton type="underline" />
                  {!isMobile ? (
                    <ColorHighlightPopover />
                  ) : (
                    <ColorHighlightPopoverButton onClick={() => setMobileView("highlighter")} />
                  )}
                  {!isMobile ? <LinkPopover /> : <LinkButton onClick={() => setMobileView("link")} />}
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                  <MarkButton type="superscript" />
                  <MarkButton type="subscript" />
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                  <TextAlignButton align="left" />
                  <TextAlignButton align="center" />
                  <TextAlignButton align="right" />
                  <TextAlignButton align="justify" />
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                  <TiptapButton
                    variant="ghost"
                    onClick={() => {
                      editor
                        ?.chain()
                        .focus()
                        .insertContent({
                          type: "brailleBlock",
                          attrs: { brailleType: "UEB Grade 2", caption: null },
                        })
                        .run();
                    }}
                    data-style="ghost"
                  >
                    Braille
                  </TiptapButton>
                  {editor && <ImageInsert editor={editor} />}
                </ToolbarGroup>

                <Spacer />
              </>
            ) : (
              <>
                <ToolbarGroup>
                  <TiptapButton variant="ghost" onClick={() => setMobileView("main")}>
                    <ArrowLeftIcon className="tiptap-button-icon" />
                    {mobileView === "highlighter" ? (
                      <HighlighterIcon className="tiptap-button-icon" />
                    ) : (
                      <LinkIcon className="tiptap-button-icon" />
                    )}
                  </TiptapButton>
                </ToolbarGroup>

                <ToolbarSeparator />

                {mobileView === "highlighter" ? (
                  <ColorHighlightPopoverContent />
                ) : (
                  <LinkContent />
                )}
              </>
            )}
          </Toolbar>
        )}

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  );
}
