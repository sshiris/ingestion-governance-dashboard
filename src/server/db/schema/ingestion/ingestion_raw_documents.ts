import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { ingestion_runs } from "./ingestion_runs";
import { rawDocumentStatusEnum } from "./enums";

export const ingestionRawDocuments = pgTable(
  "ingestion_raw_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => ingestion_runs.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    status: rawDocumentStatusEnum("status").default("PENDING_REVIEW").notNull(),
    title: text("title").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    storageUrl: text("storage_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at").defaultNow(),
    reviewedBy: text("reviewed_by"),
    rejectionReason: text("reject_reason"),
  },
  (t) => ({
    sourceExternalUnique: uniqueIndex(
      "ingestion_raw_documents_source_external_unique",
    ).on(t.source, t.externalId),
    runIndex: index("ingestion_raw_documents_run_id").on(t.runId),
    statusIndex: index("ingestion_raw_documents_status").on(t.status),
    sourceIndex: index("ingestion_raw_documents_source").on(t.source),
  }),
);
