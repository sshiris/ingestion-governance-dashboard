import { ChunkStatus, chunkStatusEnum } from "@/server/db/schema/ingestion/enums";
import { listChunks } from "@/server/services/ingestions/ingestion-chunking-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseChunkStatus(s: string | null): ChunkStatus | undefined {
  if (!s) return undefined;
  return (chunkStatusEnum.enumValues as readonly string[]).includes(s)
    ? (s as ChunkStatus)
    : undefined;
}

export async function GET(req: Request, context: { params: Promise<{ runId: string }> }) {
  try {

    const { runId } = await context.params;
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const status = parseChunkStatus(statusParam);

    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }

    if (statusParam && !status) {
      return NextResponse.json(
        {
          error: `Invalid status. Use one of: ${chunkStatusEnum.enumValues.join(", ")}`,
        },
        { status: 400 },
      );
    }
    const rows = await listChunks(runId, status);

    return NextResponse.json({ success: true, data: { chunks: rows } });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/ingestion/runs/[runId]/chunks failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
