import { generateEmbeddingsForRun } from "@/server/services/ingestions/ingestion-embeddings-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }
    const result = await generateEmbeddingsForRun(runId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("POST /api/ingestion/runs/[runId]/embeddings/generate failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
