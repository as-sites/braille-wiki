import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { documents, type ProsemirrorDocument } from "./documents";

export const documentRevisionActionValues: readonly ["save", "publish", "rollback"] = [
  "save",
  "publish",
  "rollback",
];

export type DocumentRevisionAction = (typeof documentRevisionActionValues)[number];

export const documentRevisions = pgTable(
  "document_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    prosemirrorJson: jsonb("prosemirror_json")
      .$type<ProsemirrorDocument>()
      .notNull(),
    action: text("action", { enum: documentRevisionActionValues }).notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("revisions_document_id_created_at_idx").on(
      table.documentId,
      table.createdAt.desc(),
    ),
  ],
);

export type DocumentRevision = InferSelectModel<typeof documentRevisions>;
export type NewDocumentRevision = InferInsertModel<typeof documentRevisions>;
