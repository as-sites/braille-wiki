const BRAILLE_BLOCK_PATTERN =
  /<pre\b([^>]*\bdata-braille-block\b[^>]*)>/gi;

function getAttributeValue(attributes: string, name: string) {
  const matcher = new RegExp(`${name}\\s*=\\s*(['"])(.*?)\\1`, "i");
  const match = attributes.match(matcher);

  return match?.[2] ?? null;
}

function escapeQuote(value: string) {
  return value.replace(/"/g, "&quot;");
}

export function buildBrailleAriaLabel(
  brailleType?: string | null,
  caption?: string | null,
) {
  const normalizedType = brailleType?.trim() || "Braille";
  const normalizedCaption = caption?.trim();

  if (!normalizedCaption) {
    return `Braille translation example, ${normalizedType}`;
  }

  return `Braille translation example, ${normalizedType}: ${normalizedCaption}`;
}

export function decoratePublishedHtml(html: string) {
  return html.replace(BRAILLE_BLOCK_PATTERN, (match, attributes) => {
    if (/\srole\s*=/i.test(attributes) || /\saria-label\s*=/i.test(attributes)) {
      return match;
    }

    const brailleType = getAttributeValue(attributes, "data-braille-type");
    const caption = getAttributeValue(attributes, "data-caption");
    const ariaLabel = escapeQuote(
      buildBrailleAriaLabel(brailleType, caption),
    );

    return `<pre${attributes} role="img" aria-label="${ariaLabel}">`;
  });
}
