import { db } from "@/server/db/drizzle";
import {
  ChunkStatus,
  ingestion_runs,
  ingestionChunks,
  ingestionRawDocuments,
} from "@/server/db/schema";
import { and, desc, eq, sql, count } from "drizzle-orm";
import { requireIngestionRunState } from "./ingestion-lifecycle-service";

function nowSql() {
  return sql`now()`;
}

function simpleHash(input: string): string {
  return Buffer.from(input).toString("base64").slice(0, 32);
}

/**
 * Temporary placeholder chunk generation
 * Since AI chunking is not implemented yet, this generates sample chunks
 * from approved raw documents, then moves the run to CHUNK_REVIEW.
 */
export async function generateChunksForRun(runId: string) {
  //ensure run is in correct state for chunking
  await requireIngestionRunState({
    runId,
    stage: "CHUNKING",
    status: "pending",
  });
  //check if there is any pending review raw doc, if there is then throw error and do not proceed with chunking
  const [{ pendingCount }] = await db
    .select({ pendingCount: count() })
    .from(ingestionRawDocuments)
    .where(
      and(
        eq(ingestionRawDocuments.runId, runId),
        eq(ingestionRawDocuments.status, "PENDING_REVIEW"),
      ),
    );

  if (pendingCount > 0) {
    throw new Response(
      JSON.stringify({
        error: "Chunking cannot start until all raw documents are reviewed",
      }),
      { status: 400 },
    );
  }
  //fetch all approved raw doc for the run, if there is none then throw error and do not proceed with chunking
  const approvedRawDocs = await db
    .select()
    .from(ingestionRawDocuments)
    .where(
      and(
        eq(ingestionRawDocuments.runId, runId),
        eq(ingestionRawDocuments.status, "APPROVED_RAW"),
      ),
    )
    .orderBy(desc(ingestionRawDocuments.createdAt));

  if (approvedRawDocs.length === 0) {
    throw new Response(
      JSON.stringify({ error: "No approved raw docs found for chunking" }),
      { status: 400 },
    );
  }

  //mark run as actively chunking
  await db
    .update(ingestion_runs)
    .set({
      stage: "CHUNKING",
      status: "running",
      stageUpdateAt: nowSql(),
      updatedAt: nowSql(),
      errorMessage: null,
    })
    .where(eq(ingestion_runs.id, runId));

  const chunkRows = approvedRawDocs.flatMap((doc) => {
    const baseText = `${doc.title} | ${doc.source} | ${doc.externalId}`;
    return [
      {
        rawDocId: doc.id,
        chunkId: `${doc.id}-chunk-1`,
        chunkIndex: 1,
        text: `${baseText} - sample chunk 1`,
        textHash: simpleHash(`${baseText} - sample chunk 1`),
        categoryJson: {
          category: "metadata",
          source: doc.source,
          type: "summary",
        },
        status: "PENDING_REVIEW" as const,
        createdAt: nowSql(),
      },
      {
        rawDocId: doc.id,
        chunkId: `${doc.id}-chunk-2`,
        chunkIndex: 2,
        text: `${baseText} - sample chunk 2`,
        textHash: simpleHash(`${baseText} - sample chunk 2`),
        categoryJson: {
          category: "content",
          source: doc.source,
          type: "body",
        },
        status: "PENDING_REVIEW" as const,
        createdAt: nowSql(),
      },
    ];
  });
  await db.insert(ingestionChunks).values(chunkRows);

  await db
    .update(ingestion_runs)
    .set({
      stage: "CHUNK_REVIEW",
      status: "pending",
      stageUpdateAt: nowSql(),
      updatedAt: nowSql(),
      errorMessage: null,
    })
    .where(eq(ingestion_runs.id, runId));

  return { ok: true, inserted: chunkRows.length };
}
export async function listChunks(runId: string, status?: ChunkStatus) {
  const where = status
    ? and(
        eq(ingestionRawDocuments.runId, runId),
        eq(ingestionChunks.status, status),
      )
    : eq(ingestionRawDocuments.runId, runId);
  return db
    .select({
      id: ingestionChunks.id,
      rawDocId: ingestionChunks.rawDocId,
      chunkId: ingestionChunks.chunkId,
      chunkIndex: ingestionChunks.chunkIndex,
      text: ingestionChunks.text,
      textHash: ingestionChunks.textHash,
      categoryJson: ingestionChunks.categoryJson,
      status: ingestionChunks.status,
      createdAt: ingestionChunks.createdAt,
      reviewedAt: ingestionChunks.reviewedAt,
      reviewedBy: ingestionChunks.reviewedBy,
      rejectionReason: ingestionChunks.rejectionReason,

      source: ingestionRawDocuments.source,
      externalId: ingestionRawDocuments.externalId,
      title: ingestionRawDocuments.title,
      runId: ingestionRawDocuments.runId,
    })
    .from(ingestionChunks)
    .innerJoin(
      ingestionRawDocuments,
      eq(ingestionChunks.rawDocId, ingestionRawDocuments.id),
    )
    .where(where)
    .orderBy(desc(ingestionChunks.createdAt));
}
export async function approveChunk(
  runId: string,
  chunkId: string,
  reviewedBy: string,
) {
  await requireIngestionRunState({
    runId,
    stage: "CHUNK_REVIEW",
    status: "pending",
  });

  const [updated] = await db
    .update(ingestionChunks)
    .set({
      status: "APPROVED_CHUNK",
      reviewedBy: reviewedBy,
      reviewedAt: nowSql(),
    })
    .where(
      and(
        eq(ingestionChunks.id, chunkId),
        sql`${ingestionChunks.rawDocId} in (select id from ingestion_raw_documents where run_id = ${runId})`,
        eq(ingestionChunks.status, "PENDING_REVIEW"),
      ),
    )
    .returning();

  if (!updated) {
    throw new Response(
      JSON.stringify({ error: "Chunk not found or not pending review" }),
      { status: 400 },
    );
  }

  return finalizeChunkReviewIfReady(runId);
}
export async function rejectChunk(
  runId: string,
  chunkId: string,
  reviewedBy: string,
  reason?: string,
) {
  await requireIngestionRunState({
    runId,
    stage: "CHUNK_REVIEW",
    status: "pending",
  });

  const [updated] = await db
    .update(ingestionChunks)
    .set({
      status: "REJECTED",
      reviewedAt: nowSql(),
      reviewedBy,
      rejectionReason: reason ?? "Rejected",
    })
    .where(
      and(
        eq(ingestionChunks.id, chunkId),
        eq(ingestionChunks.status, "PENDING_REVIEW"),
        sql`${ingestionChunks.rawDocId} in (
          select id from ingestion_raw_documents where run_id = ${runId}
        )`,
      ),
    )
    .returning();

  if (!updated) {
    throw new Response(
      JSON.stringify({ error: "chunk not found or not pending review" }),
      { status: 400 },
    );
  }
  return finalizeChunkReviewIfReady(runId);
}
async function finalizeChunkReviewIfReady(runId: string) {
  //check in the database if there are any pending chunk, if there is then return transation:false
  //if there is not then continue checking if there are approved chunk, if not then return transfation: false
  // if there is approved then return transation: true
  const [{ pendingCount }] = await db
    .select({ pendingCount: count() })
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

  if (pendingCount > 0) {
    return { transition: false };
  }

  const [{ approvedChunk }] = await db
    .select({ approvedChunk: count() })
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
  if (approvedChunk === 0) {
    await db
      .update(ingestion_runs)
      .set({
        status: "failed",
        stage: "FAILED",
        stageUpdateAt: nowSql(),
        updatedAt: nowSql(),
        errorMessage: "All chunks were rejected; nothing to embed.",
      })
      .where(eq(ingestion_runs.id, runId));

    return { transition: true, nextStage: "FAILED" as const };
  }

  await db
    .update(ingestion_runs)
    .set({
      stage: "EMBEDDING",
      status: "pending",
      stageUpdateAt: nowSql(),
      updatedAt: nowSql(),
      errorMessage: null,
    })
    .where(eq(ingestion_runs.id, runId));

  return { transition: true, nextStage: "EMBEDDING" as const };
}
