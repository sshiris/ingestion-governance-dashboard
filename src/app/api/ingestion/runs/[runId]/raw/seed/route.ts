import { seedRawDocsForRun } from "@/server/services/ingestions/ingestion-raw-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ runId: string }> }) {
  try {

    const body = await req.json();
    const { runId } = await context.params;
    const count = body.count ? Number(body.count) : 5;

    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }

    await seedRawDocsForRun(runId, count);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/ingestion/runs/[runId]/raw/seed failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
