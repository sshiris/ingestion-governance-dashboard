import { rejectRawDoc } from "@/server/services/ingestions/ingestion-raw-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEMO_REVIEWER_ID = "demo-admin";

export async function POST(req: Request, context: { params: Promise<{ runId: string }> }) {
  try {

    const body = await req.json();
    const { runId } = await context.params;
    const rawDocId = String(body.rawDocId ?? "");
    const reason = body.reason ? String(body.reason) : undefined;

    if (!runId || !rawDocId) {
      return NextResponse.json(
        { error: "runId and rawDocId required" },
        { status: 400 },
      );
    }

    const result = await rejectRawDoc({
      runId,
      rawDocId,
      reviewedBy: DEMO_REVIEWER_ID,
      reason,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Response) return err;
    console.log("POST /api/ingestion/runs/[runId]/raw/reject failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
