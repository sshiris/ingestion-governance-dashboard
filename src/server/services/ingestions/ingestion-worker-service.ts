// Check the ingestion run is currently allowed to fetch raw docs.
// Ask the AI worker for raw documents.
// Convert worker response into database rows.
// Save raw documents.
// Move the ingestion run to the next stage: RAW_REVIEW.

import { sql, eq } from "drizzle-orm"
import { fetchRawDocuments } from "../ai-worker/ai-worker-client"
import { requireIngestionRunState } from "./ingestion-lifecycle-service"
import { db } from "@/server/db/drizzle"
import { ingestionRawDocuments } from "@/server/db/schema/ingestion/ingestion_raw_documents"
import { ingestion_runs } from "@/server/db/schema"

function nowSql(){
    return sql`NOW()`
}

export async function fetchRawDocsWithWorker(runId: string){
    /**
     * is this run allowed to do this step
     * call external worker to fetch raw docs
     * worker response format -> database rows format
     * save raw docs into database
     * move run into next stage: RAW_REVIEW
     * return useful results
     */
    await requireIngestionRunState({
        runId,
        stage: "FETCHING_RAW",
        status: "running",
    })
    const result = await fetchRawDocuments(runId, ["FINLEX"])
    const dbRows = result.rawDocuments.map((doc) =>({
        runId: runId,
        source: doc.source,
        externalId: doc.externalId,
        status: "PENDING_REVIEW" as const,
        title: doc.title,
        publishedAt: new Date(doc.publishedAt),
        storageUrl: doc.storageUrl,
        createdAt: nowSql(),
    }))
    await db.insert(ingestionRawDocuments).values(dbRows)
    await db.update(ingestion_runs)
        .set({
            stage: "RAW_REVIEW",
            status: "pending",
            updatedAt: nowSql(),
            stageUpdateAt: nowSql(),
            errorMessage: null,
        })
        .where(eq(ingestion_runs.id, runId))
    return{
        inserted: dbRows.length,
        runId: runId,
    }
    
    // await saveRawDocsToDb(dbRows)
    // await moveRunToNextStage(input)
    // return summary
    
}