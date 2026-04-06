import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

import { brailleTypeValues } from "@braille-wiki/editor-schema";

export function BrailleBlockView(props: NodeViewProps) {
  const brailleType = String(props.node.attrs.brailleType ?? "UEB Grade 2");
  const caption = String(props.node.attrs.caption ?? "");

  return (
    <NodeViewWrapper
      className="border border-stone-300 border-l-[5px] border-l-emerald-800 bg-gradient-to-b from-stone-50 to-stone-100 rounded-lg my-4 overflow-hidden"
      data-drag-handle
    >
      <div
        className="grid grid-cols-[auto_1fr_1fr] gap-2.5 items-end p-3 border-b border-dashed border-stone-400 bg-emerald-50 max-sm:grid-cols-1"
        contentEditable={false}
      >
        <span className="self-center text-xs tracking-wider uppercase text-emerald-900 font-bold">
          Braille Example
        </span>

        <label className="grid gap-1 text-xs text-stone-600">
          Type
          <select
            value={brailleType}
            onChange={(e) => props.updateAttributes({ brailleType: e.target.value })}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {brailleTypeValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-stone-600">
          Caption
          <input
            type="text"
            value={caption}
            placeholder="Optional caption"
            onChange={(e) => props.updateAttributes({ caption: e.target.value || null })}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          />
        </label>
      </div>

      <NodeViewContent
        as="div"
        className="block min-h-[84px] p-3 font-mono text-[0.95rem] leading-snug whitespace-pre overflow-x-auto"
      />
    </NodeViewWrapper>
  );
}
