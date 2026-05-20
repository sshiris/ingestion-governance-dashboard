import { ingestion_runs, ingestionRawDocuments } from "@/server/db/schema";
import { db } from "../../db/drizzle";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createIngestionRun } from "./ingestion-runs-service";

type DiscoveredDocument = {
    externalId: string;
    title: string;
    storageUrl: string;
    publishedAt: string;
}
function nowSql() {
  return sql`now()`;
}

export async function importDiscoveredDocuments(input:{
    source: string;
    documents: DiscoveredDocument[];
    }){
    // 1. Check existing raw docs by source + externalId
    // 2. Filter only new documents
    // 3. If no new docs, return { createdRun: false }
    // 4. Create ingestion run
    // 5. Insert new raw docs linked to that run
    // 6. Return run info
    const { source, documents } = input;

    if(!source) throw new Error("Source is required");
    if(!documents.length) {
        return {
            createdRun: false,
            runId: null,
            newDocsCount: 0,
            skippedDocsCount: 0,
        }
    }
    const externalIds = documents.map(d => d.externalId);
    //find docs already in db
    const existingDocs = await db
        .select({
            externalIds: ingestionRawDocuments.externalId,
        })
        .from(ingestionRawDocuments)
        .where(
            and(
                eq(ingestionRawDocuments.source, source),
                inArray(ingestionRawDocuments.externalId, externalIds)
            )  
        );

        const existingExternalIds = new Set(existingDocs.map(d => d.externalIds));

        //keep only new docs
        const newDocs = documents.filter(
            (doc) => !existingExternalIds.has(doc.externalId)
        );

        if(newDocs.length === 0) {
            return {
                createdRun: false,
                runId: null,
                newDocsCount: 0,
                skippedDocsCount: documents.length,
            }
        }
        // create ingestion run
        const run = await createIngestionRun();

        //insert raw docs linked to that run
        const insertedRows = newDocs.map((doc) => ({
            runId: run.id,
            source,
            externalId: doc.externalId,
            title: doc.title,
            storageUrl: doc.storageUrl,
            status: "PENDING_REVIEW" as const,
            publishedAt: new Date(doc.publishedAt),
            createdAt: nowSql(),
        }))
        await db.insert(ingestionRawDocuments).values(insertedRows);
        // update run with status = "pending" and stage= "RAW_REVIEW"
        const [updatedRun] = await db.update(ingestion_runs)
        .set({
            status: "pending",
            stage: "RAW_REVIEW",
            stageUpdateAt: nowSql(),
            updatedAt: nowSql(),
        })
        .where(eq(ingestion_runs.id, run.id))
        .returning({
            id: ingestion_runs.id,
            runNo: ingestion_runs.runNo,
            status: ingestion_runs.status,
            stage: ingestion_runs.stage,
        });

        return {
            createdRun: true,
            runId: updatedRun.id,
            runNo: updatedRun.runNo,
            status: updatedRun.status,
            stage: updatedRun.stage,
            newDocsCount: newDocs.length,
            skippedDocsCount: documents.length - newDocs.length,
            insertedRows,
        }

}