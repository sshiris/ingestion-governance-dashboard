import { listEmbeddings } from "@/server/services/ingestions/ingestion-embeddings-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    if (!runId) {
      return new Response(
        JSON.stringify({ error: "runId route parameter is required" }),
        { status: 400 },
      );
    }
    const result = await listEmbeddings(runId);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("GET /api/ingestion/runs/[runId]/embeddings failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
