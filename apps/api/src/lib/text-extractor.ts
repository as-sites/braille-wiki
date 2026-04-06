import type { ProsemirrorDocument } from "@braille-wiki/db";

type ProsemirrorNode = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

function visitNode(
  node: unknown,
  textParts: string[],
  insideBrailleBlock: boolean,
): void {
  if (!node || typeof node !== "object") {
    return;
  }

  const currentNode = node as ProsemirrorNode;
  const isBrailleBlock = insideBrailleBlock || currentNode.type === "brailleBlock";

  if (!isBrailleBlock && typeof currentNode.text === "string") {
    textParts.push(currentNode.text);
  }

  if (!Array.isArray(currentNode.content)) {
    return;
  }

  for (const childNode of currentNode.content) {
    visitNode(childNode, textParts, isBrailleBlock);
  }
}

export function extractSearchableText(
  prosemirrorJson: ProsemirrorDocument | null | undefined,
): string {
  if (!prosemirrorJson) {
    return "";
  }

  const textParts: string[] = [];
  visitNode(prosemirrorJson, textParts, false);

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}
