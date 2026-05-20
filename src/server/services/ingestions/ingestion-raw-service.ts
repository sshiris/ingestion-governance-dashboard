import { and, desc, eq, sql, count } from "drizzle-orm";
import { db } from "../../db/drizzle";
import {
  ingestion_runs,
  ingestionRawDocuments,
  RawDocumentStatus,
} from "@/server/db/schema";
import { requireIngestionRunState } from "./ingestion-lifecycle-service";

function nowSql() {
  return sql`now()`;
}

//create raw documents for a run (dev helper before ai service is ready)
//create n fake docs and move the stage to raw_review
export async function seedRawDocsForRun(runId: string, n = 5) {
  await requireIngestionRunState({
    runId,
    stage: "FETCHING_RAW",
    status: "running",
  });

  const rows = Array.from({ length: n }).map((_, i) => ({
    runId: runId,
    source: "FINLEX",
    externalId: `dev-${runId}-${i + 1}`,
    title: `Dev Raw Doc #${i + 1}`,
    storageUrl: `https://example.invalid/raw/${runId}/${i + 1}`,
    status: "PENDING_REVIEW" as const,
    publishedAt: nowSql(),
    createdAt: nowSql(),
  }));

  //insert
  await db.insert(ingestionRawDocuments).values(rows);
  //Move run into stage= RAW_REVIEW and status == pending
  await db
    .update(ingestion_runs)
    .set({
      stage: "RAW_REVIEW",
      status: "pending",
      stageUpdateAt: nowSql(),
      updatedAt: nowSql(),
      errorMessage: null,
    })
    .where(eq(ingestion_runs.id, runId));
}

//list all raw docs
export async function listRawDocs({
  runId,
  status,
}: {
  runId: string;
  status?: RawDocumentStatus;
}) {
  const where = status
    ? and(
        eq(ingestionRawDocuments.runId, runId),
        eq(ingestionRawDocuments.status, status),
      )
    : eq(ingestionRawDocuments.runId, runId);
  return db
    .select()
    .from(ingestionRawDocuments)
    .where(where)
    .orderBy(desc(ingestionRawDocuments.createdAt));
}

//approve raw doc
export async function approveRawDoc({
  runId,
  rawDocId,
  reviewedBy,
}: {
  runId: string;
  rawDocId: string;
  reviewedBy: string;
}) {
  await requireIngestionRunState({
    runId,
    stage: "RAW_REVIEW",
    status: "pending",
  });

  const [update] = await db
    .update(ingestionRawDocuments)
    .set({
      status: "APPROVED_RAW",
      reviewedBy: reviewedBy,
      reviewedAt: nowSql(),
    })
    .where(
      and(
        eq(ingestionRawDocuments.runId, runId),
        eq(ingestionRawDocuments.id, rawDocId),
        eq(ingestionRawDocuments.status, "PENDING_REVIEW"),
      ),
    )
    .returning();
  if (!update) {
    throw new Response(
      JSON.stringify({
        error: "Raw doc not found or not pending review",
        status: 400,
      }),
    );
  }
  return await finalizeRawReviewIfReady(runId);
}

export async function rejectRawDoc(params: {
  runId: string;
  rawDocId: string;
  reviewedBy: string;
  reason?: string;
}) {
  const { runId, rawDocId, reviewedBy, reason } = params;
  await requireIngestionRunState({
    runId,
    stage: "RAW_REVIEW",
    status: "pending",
  });

  const [updated] = await db
    .update(ingestionRawDocuments)
    .set({
      status: "REJECTED",
      reviewedBy: reviewedBy,
      reviewedAt: nowSql(),
      rejectionReason: reason ?? "Rejected",
    })
    .where(
      and(
        eq(ingestionRawDocuments.id, rawDocId),
        eq(ingestionRawDocuments.status, "PENDING_REVIEW"),
        eq(ingestionRawDocuments.runId, runId),
      ),
    )
    .returning();
  if (!updated) {
    throw new Response(
      JSON.stringify({
        error: "Raw doc not found or not pending review",
        status: 400,
      }),
    );
  }
  return await finalizeRawReviewIfReady(runId);
}
// after each approval decision, check if RAW_REVIEW is complete
async function finalizeRawReviewIfReady(runId: string) {
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
    return { transitioned: false };
  }
  const [{ approvedCount }] = await db
    .select({ approvedCount: count() })
    .from(ingestionRawDocuments)
    .where(
      and(
        eq(ingestionRawDocuments.runId, runId),
        eq(ingestionRawDocuments.status, "APPROVED_RAW"),
      ),
    );
  if (approvedCount === 0) {
    await db
      .update(ingestion_runs)
      .set({
        stage: "FAILED",
        status: "failed",
        stageUpdateAt: nowSql(),
        updatedAt: nowSql(),
        errorMessage: "All raw documents were rejected, nothing to chunk.",
      })
      .where(eq(ingestion_runs.id, runId));
    return { transitioned: true, nextStage: "FAILED" as const };
  }
  await db
    .update(ingestion_runs)
    .set({
      stage: "CHUNKING",
      status: "pending",
      stageUpdateAt: nowSql(),
      updatedAt: nowSql(),
      errorMessage: null,
    })
    .where(eq(ingestion_runs.id, runId));

  return { transitioned: true, nextStage: "Chunking" as const };
}
