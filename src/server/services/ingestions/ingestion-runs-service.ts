import { db } from "@/server/db/drizzle";
import { ingestion_runs, RunStage, RunStatus } from "@/server/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export type IngestionRunRow = {
  id: string;
  runNo: number;
  status: RunStatus;
  stage: RunStage;
  stageUpdatedAt: Date;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function nowSql() {
  return sql`now()`;
}
/**
 * Creates a run and sets it to the first active lifecycle state:
 * stage=FETCHING_RAW, status=running
 *
 * Note: AI integration is not implemented yet, so this only creates the run.
 */
export async function createIngestionRun(): Promise<IngestionRunRow> {
  const [{ current }] = await db
    .select({
      current: sql<number>`coalesce(max(${ingestion_runs.runNo}), 0)`,
    })
    .from(ingestion_runs);
  const next = current + 1;

  const [row] = await db
    .insert(ingestion_runs)
    .values({
      runNo: next,
      status: "running",
      stage: "FETCHING_RAW",
      stageUpdateAt: nowSql(),
      updatedAt: nowSql(),
    })
    .returning();

  return row as unknown as IngestionRunRow;
}

export async function listIngestionRuns(
  limit = 50,
): Promise<IngestionRunRow[]> {
  //returns newest first
  //limit is enforced
  // no bussiness logic side effects
  const rows = await db
    .select()
    .from(ingestion_runs)
    .orderBy(desc(ingestion_runs.createdAt))
    .limit(limit);

  return rows as unknown as IngestionRunRow[];
}

export async function getIngestionRunById(
  runId: string,
): Promise<IngestionRunRow | null> {
  const [row] = await db
    .select()
    .from(ingestion_runs)
    .where(eq(ingestion_runs.id, runId));

  return (row as unknown as IngestionRunRow) ?? null;
}
