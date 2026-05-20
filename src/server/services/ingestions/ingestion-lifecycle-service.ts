import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { ingestion_runs, RunStage, RunStatus } from "@/server/db/schema";

export async function requireIngestionRunState({
  runId,
  stage,
  status,
}: {
  runId: string;
  stage: RunStage;
  status: RunStatus;
}) {
  const [run] = await db
    .select({
      id: ingestion_runs.id,
      stage: ingestion_runs.stage,
      status: ingestion_runs.status,
    })
    .from(ingestion_runs)
    .where(
      and(
        eq(ingestion_runs.id, runId),
        eq(ingestion_runs.stage, stage),
        eq(ingestion_runs.status, status),
      ),
    );

  if (!run) {
    throw new Response(
      JSON.stringify({
        error: `Run must be ${stage} with status ${status} for this action`,
      }),
      { status: 409 },
    );
  }

  return run;
}
