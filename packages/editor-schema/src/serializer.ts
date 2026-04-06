import { generateHTML } from "@tiptap/html";
import { generateHTML as generateHTMLServer } from "@tiptap/html/server";

import { getExtensions } from "./extensions";

export type ImageUrlResolver = (mediaId: string) => string;

/**
 * Walk a ProseMirror JSON node tree and replace image `src` attributes
 * using the provided resolver. Returns a new object (deep clone).
 */
function resolveImageUrls(node: unknown, resolver: ImageUrlResolver): unknown {
  if (!node || typeof node !== "object") {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => resolveImageUrls(item, resolver));
  }

  const record = node as Record<string, unknown>;

  if (record.type === "image" && record.attrs && typeof record.attrs === "object") {
    const attrs = record.attrs as Record<string, unknown>;
    const src = attrs.src;

    if (typeof src === "string") {
      return {
        ...record,
        attrs: { ...attrs, src: resolver(src) },
      };
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = resolveImageUrls(value, resolver);
  }

  return result;
}

export interface SerializeOptions {
  /**
   * When provided, image `src` attributes (which store media IDs at edit time)
   * are passed through this resolver to produce public URLs. Used at publish time.
   */
  imageUrlResolver?: ImageUrlResolver;
}

export function serializeToHtml(
  prosemirrorJson: object,
  options: SerializeOptions = {},
): string {
  const json = options.imageUrlResolver
    ? (resolveImageUrls(prosemirrorJson, options.imageUrlResolver) as object)
    : prosemirrorJson;

  if (typeof window === "undefined") {
    return generateHTMLServer(json, getExtensions());
  }

  return generateHTML(json, getExtensions());
}

/**
 * Node-safe serializer for server-side publish flow.
 */
export function serializeToHtmlServer(
  prosemirrorJson: object,
  options: SerializeOptions = {},
): string {
  const json = options.imageUrlResolver
    ? (resolveImageUrls(prosemirrorJson, options.imageUrlResolver) as object)
    : prosemirrorJson;

  return generateHTMLServer(json, getExtensions());
}
