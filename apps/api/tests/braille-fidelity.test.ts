import { describe, expect, it } from "vitest";
import { serializeToHtml } from "@braille-wiki/editor-schema";

describe("Braille fidelity — character-level whitespace preservation", () => {
  /**
   * Test helper to extract text content from rendered HTML.
   */
  function extractBrailleContent(html: string): string {
    const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    return match ? match[1] : "";
  }

  it("preserves multiple consecutive spaces", () => {
    const brailleText = "⠓⠑⠇⠇⠕     ⠺⠕⠗⠇⠙"; // 5 spaces between words
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "UEB Grade 2" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);
    const extracted = extractBrailleContent(html);

    expect(extracted).toBe(brailleText);
  });

  it("preserves leading spaces on lines", () => {
    const brailleText = "   ⠓⠑⠇⠇⠕\n⠺⠕⠗⠇⠙";
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "UEB Grade 2" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);
    const extracted = extractBrailleContent(html);

    expect(extracted).toBe(brailleText);
  });

  it("preserves trailing spaces on lines", () => {
    const brailleText = "⠓⠑⠇⠇⠕   \n⠺⠕⠗⠇⠙   ";
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "UEB Grade 2" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);
    const extracted = extractBrailleContent(html);

    expect(extracted).toBe(brailleText);
  });

  it("preserves blank lines between braille lines", () => {
    const brailleText = "⠓⠑⠇⠇⠕\n\n⠺⠕⠗⠇⠙";
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "UEB Grade 2" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);
    const extracted = extractBrailleContent(html);

    expect(extracted).toBe(brailleText);
  });

  it("preserves tab characters", () => {
    const brailleText = "⠓⠑⠇⠇⠕\t⠺⠕⠗⠇⠙";
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "UEB Grade 2" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);
    const extracted = extractBrailleContent(html);

    expect(extracted).toBe(brailleText);
  });

  it("handles complex multi-line braille with mixed whitespace", () => {
    const brailleText =
      "⠓⠑⠇⠇⠕     ⠺⠕⠗⠇⠙\n  ⠞⠓⠊⠎\t⠊⠎\n\n  ⠁  ⠞⠑⠎⠞";
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "UEB Grade 2" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);
    const extracted = extractBrailleContent(html);

    expect(extracted).toBe(brailleText);
  });

  it("renders braille block as <pre><code> structure", () => {
    const brailleText = "⠓⠑⠇⠇⠕";
    const json = {
      type: "doc",
      content: [
        {
          type: "brailleBlock",
          attrs: { brailleType: "Nemeth" },
          content: [{ type: "text", text: brailleText }],
        },
      ],
    };

    const html = serializeToHtml(json);

    expect(html).toMatch(/<pre[^>]*data-braille-block[^>]*>/);
    expect(html).toMatch(/<code[^>]*>/);
    expect(html).toContain(brailleText);
  });
});
