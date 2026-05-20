import { getIngestionRunById } from "@/server/services/ingestions/ingestion-runs-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ runId: string }> }) {
    try {
        const {runId} = await context.params;
        if (!runId){
            return NextResponse.json(
                {error: "runId is required"},
                {status: 400}
            )
        }
        const run = await getIngestionRunById(runId);
        if(!run){
            return NextResponse.json(
                {error:"Ingestion run not found"},
                {status: 404}
            )
        }
        return NextResponse.json({
            success: true,
            data: {
                ingestion_run_id: run.id,
                run_no: run.runNo,
                status: run.status,
                stage: run.stage,
                stage_updated_at: run.stageUpdatedAt,
                created_at: run.createdAt,
                updated_at: run.updatedAt,
                error_message: run.errorMessage,
            },
        });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error("GET /api/ingestion/runs/[runId] failed:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
