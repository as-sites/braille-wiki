import type { InferSelectModel } from "drizzle-orm";

import type {
  documentLinks,
  documentRevisions,
  documents,
} from "@braille-wiki/db/dist/schema";

export type Document = InferSelectModel<typeof documents>;
export type DocumentRevision = InferSelectModel<typeof documentRevisions>;

type DocumentLinkRow = InferSelectModel<typeof documentLinks>;

export type DocumentLink = {
  source_path: DocumentLinkRow["sourcePath"];
  target_path: DocumentLinkRow["targetPath"];
};

export type DocumentTreeNode = {
  path: string;
  title: string;
  position: number;
  children: DocumentTreeNode[];
};

export type DocumentBreadcrumb = {
  path: string;
  title: string;
};