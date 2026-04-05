import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mock @braille-docs/db ---
vi.mock("@braille-docs/db", () => {
  return {
    db: {},
    getDocumentById: vi.fn(),
    publishDocument: vi.fn(),
    unpublishDocument: vi.fn(),
    updateDocument: vi.fn(),
    createRevision: vi.fn(),
    rebuildLinksForDocument: vi.fn(),
  };
});

// --- mock search service ---
vi.mock("../src/services/search", () => ({
  indexPublishedDocument: vi.fn(),
  removeDocumentFromSearchIndex: vi.fn(),
}));

// --- mock cache ---
vi.mock("../src/lib/cache", () => ({
  invalidateCacheTags: vi.fn(),
  docCacheTag: (path: string) => `doc:${path}`,
}));

import * as dbModule from "@braille-docs/db";
import * as searchService from "../src/services/search";
import * as cacheModule from "../src/lib/cache";
import {
  publishDocument,
  unpublishDocument,
  discardDraft,
} from "../src/services/publishing";

const mockGetDocumentById = vi.mocked(dbModule.getDocumentById);
const mockPublishDocument = vi.mocked(dbModule.publishDocument);
const mockUnpublishDocument = vi.mocked(dbModule.unpublishDocument);
const mockUpdateDocument = vi.mocked(dbModule.updateDocument);
const mockCreateRevision = vi.mocked(dbModule.createRevision);
const mockRebuildLinks = vi.mocked(dbModule.rebuildLinksForDocument);
const mockIndexDocument = vi.mocked(searchService.indexPublishedDocument);
const mockRemoveFromIndex = vi.mocked(searchService.removeDocumentFromSearchIndex);
const mockInvalidateCache = vi.mocked(cacheModule.invalidateCacheTags);

const BRAILLE_TEXT = "⠓⠑⠇⠇⠕     ⠺⠕⠗⠇⠙\n  ⠞⠓⠊⠎\t⠊⠎\n\n  ⠁  ⠞⠑⠎⠞";

const BASE_DOCUMENT = {
  id: "doc-1",
  path: "nemeth/chapter-1",
  slug: "chapter-1",
  title: "Chapter 1",
  description: "Intro chapter",
  status: "draft" as const,
  position: 0,
  metadata: null,
  prosemirrorJson: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Hello world",
            marks: [
              { type: "link", attrs: { href: "/nemeth/chapter-2", title: null } },
            ],
          },
        ],
      },
      {
        type: "brailleBlock",
        attrs: { brailleType: "Nemeth" },
        content: [{ type: "text", text: BRAILLE_TEXT }],
      },
    ],
  },
  publishedProsemirrorJson: null,
  renderedHtml: null,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: null,
};

const PUBLISHED_DOCUMENT = {
  ...BASE_DOCUMENT,
  status: "published" as const,
  renderedHtml: "<p>Hello world</p>",
  publishedProsemirrorJson: BASE_DOCUMENT.prosemirrorJson,
  publishedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateRevision.mockResolvedValue({
    id: "rev-1",
    documentId: "doc-1",
    prosemirrorJson: {},
    action: "publish",
    createdBy: "user-1",
    createdAt: new Date(),
  });
  mockRebuildLinks.mockResolvedValue([]);
  mockIndexDocument.mockResolvedValue(undefined);
  mockRemoveFromIndex.mockResolvedValue(undefined);
  mockInvalidateCache.mockResolvedValue(undefined);
});

describe("publishDocument", () => {
  it("serializes prosemirror_json to rendered_html", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);
    mockPublishDocument.mockResolvedValue(PUBLISHED_DOCUMENT);

    const result = await publishDocument("doc-1", "user-1");

    expect(mockPublishDocument).toHaveBeenCalledWith(
      expect.anything(),
      "doc-1",
      expect.stringContaining("<"),
      BASE_DOCUMENT.prosemirrorJson,
    );
    expect(result.status).toBe("published");
  });

  it("sets published_prosemirror_json to snapshot of prosemirror_json", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);
    mockPublishDocument.mockResolvedValue(PUBLISHED_DOCUMENT);

    await publishDocument("doc-1", "user-1");

    const [, , , snapshotArg] = mockPublishDocument.mock.calls[0];
    expect(snapshotArg).toEqual(BASE_DOCUMENT.prosemirrorJson);
  });

  it("creates a revision with action publish", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);
    mockPublishDocument.mockResolvedValue(PUBLISHED_DOCUMENT);

    await publishDocument("doc-1", "user-1");

    expect(mockCreateRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "publish", documentId: "doc-1" }),
    );
  });

  it("rebuilds document_links from extracted internal links", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);
    mockPublishDocument.mockResolvedValue(PUBLISHED_DOCUMENT);

    await publishDocument("doc-1", "user-1");

    expect(mockRebuildLinks).toHaveBeenCalledWith(
      expect.anything(),
      "nemeth/chapter-1",
      expect.arrayContaining(["nemeth/chapter-2"]),
    );
  });

  it("updates the search index", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);
    mockPublishDocument.mockResolvedValue(PUBLISHED_DOCUMENT);

    await publishDocument("doc-1", "user-1");

    expect(mockIndexDocument).toHaveBeenCalledWith(
      expect.objectContaining({ path: "nemeth/chapter-1", title: "Chapter 1" }),
    );
  });

  it("invalidates cache for the published page", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);
    mockPublishDocument.mockResolvedValue(PUBLISHED_DOCUMENT);

    await publishDocument("doc-1", "user-1");

    expect(mockInvalidateCache).toHaveBeenCalledWith(
      expect.arrayContaining(["doc:nemeth/chapter-1"]),
    );
  });

  it("invalidates doc:index for root-level documents", async () => {
    const rootDoc = { ...BASE_DOCUMENT, path: "nemeth", slug: "nemeth" };
    const rootPublished = { ...PUBLISHED_DOCUMENT, path: "nemeth", slug: "nemeth" };
    mockGetDocumentById.mockResolvedValue(rootDoc);
    mockPublishDocument.mockResolvedValue(rootPublished);

    await publishDocument("doc-1", "user-1");

    const [tags] = mockInvalidateCache.mock.calls[0];
    expect(tags).toContain("doc:index");
  });

  it("preserves BrailleBlock content character-for-character in rendered_html", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);

    let capturedHtml = "";
    mockPublishDocument.mockImplementation(async (_, __, html) => {
      capturedHtml = html;
      return PUBLISHED_DOCUMENT;
    });

    await publishDocument("doc-1", "user-1");

    const match = capturedHtml.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    const extracted = match ? match[1] : "";
    expect(extracted).toBe(BRAILLE_TEXT);
  });

  it("throws NotFoundError if document does not exist", async () => {
    mockGetDocumentById.mockResolvedValue(null);

    await expect(publishDocument("missing", "user-1")).rejects.toThrow("not found");
  });
});

describe("unpublishDocument", () => {
  it("sets status to draft and clears rendered_html", async () => {
    mockGetDocumentById.mockResolvedValue(PUBLISHED_DOCUMENT);
    mockUnpublishDocument.mockResolvedValue({ ...PUBLISHED_DOCUMENT, status: "draft", renderedHtml: null });

    const result = await unpublishDocument("doc-1", "user-1");

    expect(mockUnpublishDocument).toHaveBeenCalledWith(expect.anything(), "doc-1");
    expect(result.status).toBe("draft");
    expect(result.renderedHtml).toBeNull();
  });

  it("removes document from search index", async () => {
    mockGetDocumentById.mockResolvedValue(PUBLISHED_DOCUMENT);
    mockUnpublishDocument.mockResolvedValue({ ...PUBLISHED_DOCUMENT, status: "draft", renderedHtml: null });

    await unpublishDocument("doc-1", "user-1");

    expect(mockRemoveFromIndex).toHaveBeenCalledWith("nemeth/chapter-1");
  });

  it("invalidates cache for the page", async () => {
    mockGetDocumentById.mockResolvedValue(PUBLISHED_DOCUMENT);
    mockUnpublishDocument.mockResolvedValue({ ...PUBLISHED_DOCUMENT, status: "draft", renderedHtml: null });

    await unpublishDocument("doc-1", "user-1");

    expect(mockInvalidateCache).toHaveBeenCalledWith(
      expect.arrayContaining(["doc:nemeth/chapter-1"]),
    );
  });

  it("throws BusinessLogicError if document is not published", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT);

    await expect(unpublishDocument("doc-1", "user-1")).rejects.toThrow();
  });

  it("throws NotFoundError if document does not exist", async () => {
    mockGetDocumentById.mockResolvedValue(null);

    await expect(unpublishDocument("missing", "user-1")).rejects.toThrow("not found");
  });
});

describe("discardDraft", () => {
  it("restores prosemirror_json from published snapshot", async () => {
    const docWithPublished = {
      ...BASE_DOCUMENT,
      prosemirrorJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Draft changes" }] }] },
      publishedProsemirrorJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Published version" }] }] },
    };
    mockGetDocumentById.mockResolvedValue(docWithPublished);
    mockUpdateDocument.mockResolvedValue({ ...docWithPublished, prosemirrorJson: docWithPublished.publishedProsemirrorJson });

    const result = await discardDraft("doc-1", "user-1");

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      expect.anything(),
      "doc-1",
      expect.objectContaining({ prosemirrorJson: docWithPublished.publishedProsemirrorJson }),
    );
    expect(result.prosemirrorJson).toEqual(docWithPublished.publishedProsemirrorJson);
  });

  it("creates a save revision before discarding", async () => {
    const docWithPublished = {
      ...BASE_DOCUMENT,
      publishedProsemirrorJson: { type: "doc", content: [] },
    };
    mockGetDocumentById.mockResolvedValue(docWithPublished);
    mockUpdateDocument.mockResolvedValue(docWithPublished);

    await discardDraft("doc-1", "user-1");

    expect(mockCreateRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "save" }),
    );
  });

  it("throws BusinessLogicError if document was never published", async () => {
    mockGetDocumentById.mockResolvedValue(BASE_DOCUMENT); // publishedProsemirrorJson is null

    await expect(discardDraft("doc-1", "user-1")).rejects.toThrow("never been published");
  });

  it("throws NotFoundError if document does not exist", async () => {
    mockGetDocumentById.mockResolvedValue(null);

    await expect(discardDraft("missing", "user-1")).rejects.toThrow("not found");
  });
});
