import {
  jsonb,
  pgTable,
  integer,
  timestamp,
  text,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { chunkStatusEnum } from "./enums";
import { ingestionRawDocuments } from "./ingestion_raw_documents";

export const ingestionChunks = pgTable(
  "ingestion_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rawDocId: uuid("raw_doc_id")
      .notNull()
      .references(() => ingestionRawDocuments.id, { onDelete: "cascade" }),
    chunkId: text("chunk_id"),
    chunkIndex: integer("chunk_index"),
    text: text("text").notNull(),
    textHash: text("text_hash").notNull(),
    categoryJson: jsonb("category_json").notNull().default({}),
    status: chunkStatusEnum("status").default("PENDING_REVIEW"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow(),
    reviewedBy: text("reviewed_by"),
    rejectionReason: text("rejection_reason"),
  },

  (t) => ({
    rawChunkIndexUnque: uniqueIndex(
      "ingestion_chunks_raw_doc_chunk_index_unique",
    ).on(t.rawDocId, t.chunkIndex),
    rawDocIndex: index("ingestion_chunks_raw_doc_index").on(t.rawDocId),
    statusIdx: index("ingestion_chunks_status_index").on(t.status),
  }),
);
