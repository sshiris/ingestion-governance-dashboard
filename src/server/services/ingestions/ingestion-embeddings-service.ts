import { db } from "@/server/db/drizzle";
import {
  ingestion_runs,
  ingestionChunks,
  ingestionEmbeddings,
  ingestionRawDocuments,
} from "@/server/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { requireIngestionRunState } from "./ingestion-lifecycle-service";

function nowSql() {
  return sql`now()`;
}

function fakeEmbedding(text: string) {
  return {
    dense: [text.length, text.length % 10, 0.123, 0.456],
  };
}

export async function generateEmbeddingsForRun(runId: string) {
  try {
    await requireIngestionRunState({
      runId,
      stage: "EMBEDDING",
      status: "pending",
    });

    const [{ pendingReviewChunks }] = await db
      .select({ pendingReviewChunks: count() })
      .from(ingestionChunks)
      .innerJoin(
        ingestionRawDocuments,
        eq(ingestionChunks.rawDocId, ingestionRawDocuments.id),
      )
      .where(
        and(
          eq(ingestionRawDocuments.runId, runId),
          eq(ingestionChunks.status, "PENDING_REVIEW"),
        ),
      );

    if (pendingReviewChunks > 0) {
      throw new Response(
        JSON.stringify({
          error: "Embeddings cannot start until all chunks are reviewed",
        }),
        { status: 400 },
      );
    }

    const approvedChunks = await db
      .select({
        id: ingestionChunks.id,
        text: ingestionChunks.text,
        textHash: ingestionChunks.textHash,
      })
      .from(ingestionChunks)
      .innerJoin(
        ingestionRawDocuments,
        eq(ingestionChunks.rawDocId, ingestionRawDocuments.id),
      )
      .where(
        and(
          eq(ingestionRawDocuments.runId, runId),
          eq(ingestionChunks.status, "APPROVED_CHUNK"),
        ),
      );
    if (approvedChunks.length === 0) {
      throw new Response(
        JSON.stringify({
          error: "No approved chunks found for embedding",
        }),
        { status: 400 },
      );
    }
    await db
      .update(ingestion_runs)
      .set({
        status: "running",
        stage: "EMBEDDING",
        stageUpdateAt: nowSql(),
        updatedAt: nowSql(),
        errorMessage: null,
      })
      .where(eq(ingestion_runs.id, runId));

    const embeddingRows = approvedChunks.map((chunk) => ({
      chunkId: chunk.id,
      model: "placeholder-model",
      inputTexthash: chunk.textHash,
      embedding: fakeEmbedding(chunk.text),
      isActive: true,
      createdAt: nowSql(),
      embeddedAt: nowSql(),
      error: null,
    }));

    const insertedRows = await db
      .insert(ingestionEmbeddings)
      .values(embeddingRows)
      .returning({
        id: ingestionEmbeddings.id,
        chunkId: ingestionEmbeddings.chunkId,
      });

    await db
      .update(ingestion_runs)
      .set({
        stage: "EMBEDDED",
        status: "completed",
        stageUpdateAt: nowSql(),
        updatedAt: nowSql(),
        errorMessage: null,
      })
      .where(eq(ingestion_runs.id, runId));

    return {
      ok: true,
      inserted: insertedRows.length,
      insertedRows: insertedRows,
    };
  } catch (error) {
    if (!(error instanceof Response)) {
      await db
        .update(ingestion_runs)
        .set({
          stage: "FAILED",
          status: "failed",
          stageUpdateAt: nowSql(),
          updatedAt: nowSql(),
          errorMessage:
            error instanceof Error
              ? error.message
              : "Embedding generation failed",
        })
        .where(eq(ingestion_runs.id, runId));
    }
    throw error;
  }
}

export async function listEmbeddings(runId: string) {
  return await db
    .select({
      id: ingestionEmbeddings.id,
      chunkId: ingestionEmbeddings.chunkId,
      model: ingestionEmbeddings.model,
      inputTexthash: ingestionEmbeddings.inputTexthash,
      embedding: ingestionEmbeddings.embedding,
      isActive: ingestionEmbeddings.isActive,
      createdAt: ingestionEmbeddings.createdAt,
      embeddedAt: ingestionEmbeddings.embeddedAt,
      error: ingestionEmbeddings.error,
    })
    .from(ingestionEmbeddings)
    .innerJoin(
      ingestionChunks,
      eq(ingestionEmbeddings.chunkId, ingestionChunks.id),
    )
    .innerJoin(
      ingestionRawDocuments,
      eq(ingestionChunks.rawDocId, ingestionRawDocuments.id),
    )
    .where(eq(ingestionRawDocuments.runId, runId))
    .orderBy(desc(ingestionEmbeddings.createdAt));
}
