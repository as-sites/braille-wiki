type ProsemirrorNode = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
  marks?: unknown;
  attrs?: unknown;
};

type ProsemirrorMark = {
  type?: unknown;
  attrs?: Record<string, unknown>;
};

function visitNodeForLinks(node: unknown, hrefs: Set<string>): void {
  if (!node || typeof node !== "object") {
    return;
  }

  const currentNode = node as ProsemirrorNode;

  if (Array.isArray(currentNode.marks)) {
    for (const mark of currentNode.marks) {
      const m = mark as ProsemirrorMark;

      if (m.type === "link" && m.attrs) {
        const href = m.attrs["href"];

        if (typeof href === "string") {
          hrefs.add(href);
        }
      }
    }
  }

  if (Array.isArray(currentNode.content)) {
    for (const child of currentNode.content) {
      visitNodeForLinks(child, hrefs);
    }
  }
}

function isInternalPath(href: string): boolean {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
    return false;
  }

  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
    return false;
  }

  return true;
}

function normalizeInternalPath(href: string): string {
  return href.replace(/^\//, "").split("#")[0].split("?")[0];
}

/**
 * Walk a ProseMirror JSON tree and return deduplicated internal link paths.
 */
export function extractInternalLinks(prosemirrorJson: object): string[] {
  const hrefs = new Set<string>();
  visitNodeForLinks(prosemirrorJson, hrefs);

  const paths = new Set<string>();

  for (const href of hrefs) {
    if (isInternalPath(href)) {
      const path = normalizeInternalPath(href);

      if (path) {
        paths.add(path);
      }
    }
  }

  return [...paths];
}
