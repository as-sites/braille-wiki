import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

import { brailleTypeValues } from "@braille-docs/editor-schema";

export function BrailleBlockView(props: NodeViewProps) {
  const brailleType = String(props.node.attrs.brailleType ?? "UEB Grade 2");
  const caption = String(props.node.attrs.caption ?? "");

  return (
    <NodeViewWrapper className="braille-block" data-drag-handle>
      <div className="braille-block__header" contentEditable={false}>
        <span className="braille-block__label">Braille Example</span>

        <label>
          Type
          <select
            value={brailleType}
            onChange={(event) => props.updateAttributes({ brailleType: event.target.value })}
          >
            {brailleTypeValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          Caption
          <input
            type="text"
            value={caption}
            placeholder="Optional caption"
            onChange={(event) => props.updateAttributes({ caption: event.target.value || null })}
          />
        </label>
      </div>

      <NodeViewContent as="div" className="braille-block__content" />
    </NodeViewWrapper>
  );
}
