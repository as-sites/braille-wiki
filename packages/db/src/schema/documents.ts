import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const documentStatusValues: readonly ["draft", "published", "archived"] = [
  "draft",
  "published",
  "archived",
];

export type DocumentStatus = (typeof documentStatusValues)[number];

export type DocumentMetadata = Record<string, unknown>;
export type ProsemirrorDocument = Record<string, unknown>;

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    path: text("path").notNull(),
    slug: text("slug").notNull(),
    position: integer("position").notNull().default(0),
    title: text("title").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").$type<DocumentMetadata>(),
    status: text("status", { enum: documentStatusValues })
      .notNull()
      .default("draft"),
    prosemirrorJson:
      jsonb("prosemirror_json").$type<ProsemirrorDocument>(),
    publishedProsemirrorJson: jsonb("published_prosemirror_json").$type<ProsemirrorDocument>(),
    renderedHtml: text("rendered_html"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("documents_path_unique").on(table.path),
    index("documents_status_idx")
      .on(table.status)
      .where(sql`${table.status} = 'published'`),
  ],
);

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;
