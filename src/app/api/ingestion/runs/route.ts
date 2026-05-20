import { NextResponse } from "next/server";
import {
  createIngestionRun,
  listIngestionRuns,
} from "@/server/services/ingestions/ingestion-runs-service";

export const runtime = "nodejs";

export async function POST() {
  try {

    const run = await createIngestionRun();

    return NextResponse.json({
      success: true,
      data: {
        ingestion_run_id: run.id,
        run_no: run.runNo,
        status: run.status,
        stage: run.stage,
        stage_updated_at: run.stageUpdatedAt,
        created_at: run.createdAt,
        error_message: run.errorMessage,
        updated_at: run.updatedAt,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/ingestion/runs failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam
      ? Math.max(1, Math.min(200, Number(limitParam)))
      : 50;

    const runs = await listIngestionRuns(limit);

    return NextResponse.json({
      success: true,
      data: {
        runs: runs.map((r) => ({
          ingestion_run_id: r.id,
          run_no: r.runNo,
          status: r.status,
          stage: r.stage,
          stage_updated_at: r.stageUpdatedAt,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
          error_message: r.errorMessage,
        })),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/ingestion/runs failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
