import { rejectChunk } from "@/server/services/ingestions/ingestion-chunking-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEMO_REVIEWER_ID = "demo-admin";

export async function POST(req: Request, context: { params: Promise<{ runId: string }> }) {
  try {

    const body = await req.json();
    const { runId } = await context.params;
    const chunkId = String(body.chunkId ?? "");
    const reviewedBy = DEMO_REVIEWER_ID;
    const reason = body.reason ? String(body.reason) : undefined;

    if (!runId || !chunkId) {
      return NextResponse.json(
        { error: "runId and chunkId required" },
        { status: 400 },
      );
    }

    const result = await rejectChunk(runId, chunkId, reviewedBy, reason);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/ingestion/runs/[runId]/chunks/reject failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
