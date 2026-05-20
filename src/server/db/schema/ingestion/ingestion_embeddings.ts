// src/server/db/schema/ingestion/ingestion_embeddings.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { ingestionChunks } from "./ingestion_chunks";
import { uniqueIndex, index } from "drizzle-orm/pg-core";

export const ingestionEmbeddings = pgTable(
  "ingestion_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => ingestionChunks.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    inputTexthash: text("input_text_hash").notNull(),
    // Prototype: store embedding JSON. Later you can replace with vector store reference.
    embedding: jsonb("embedding"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    embeddedAt: timestamp("embedded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    error: text("error"),
  },
  (t) => ({
    chunkUnique: uniqueIndex("ingestion_embeddings_chunk_unique").on(t.chunkId),
    activeIndex: index("ingestion_embeddings_active").on(t.isActive),
  }),
);
