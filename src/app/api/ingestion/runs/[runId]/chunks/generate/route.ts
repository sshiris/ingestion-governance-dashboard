import { generateChunksForRun } from "@/server/services/ingestions/ingestion-chunking-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ runId: string }> }) {
  try {

    const { runId } = await context.params;

    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }

    const result = await generateChunksForRun(runId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/ingestion/runs/[runId]/chunks/generate failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
