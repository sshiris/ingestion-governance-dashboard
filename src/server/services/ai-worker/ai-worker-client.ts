type WorkerRawDocument = {
    source: string;
    externalId: string;
    title: string;
    storageUrl: string;
    publishedAt: string;
}

type FetchRawResponse = {
    run_id: string;
    rawDocuments: WorkerRawDocument[];
}

const AI_WORKER_URL = process.env.AI_WORKER_URL ?? "http://localhost:8000";

export async function fetchRawDocuments(run_id: string, sources: string[]): Promise<FetchRawResponse> {
    const res = await fetch(`${AI_WORKER_URL}/worker/ingestion-runs/${run_id}/fetch-raw`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({sources: sources}),
    });
    if(!res.ok){
        throw new Error(`AI WORKER failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
}