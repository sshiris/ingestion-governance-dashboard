import { NextResponse } from "next/server";
import { listRawDocs } from "@/server/services/ingestions/ingestion-raw-service";
import { RawDocumentStatus, rawDocumentStatusEnum } from "@/server/db/schema/ingestion/enums";


export const runtime = "nodejs";

const RAW_DOC_STATUS_SET = new Set(rawDocumentStatusEnum.enumValues);

function parseRawStatus(s: string | null): RawDocumentStatus | undefined {
  if (!s) return undefined;

  if(!RAW_DOC_STATUS_SET.has(s as RawDocumentStatus)) {
    throw new Error(`Invalid status: ${s}`);
  }
  return s as RawDocumentStatus;
}

export async function GET(req: Request, context: { params: Promise<{ runId: string }> }) {
  try {

    const { runId } = await context.params;
    const url = new URL(req.url);
    const status = parseRawStatus(url.searchParams.get("status"));

    if (!runId)
      return NextResponse.json({ error: "runId requried" }, { status: 400 });

    const rows = await listRawDocs({ runId, status });

    return NextResponse.json({success: true, data: { raw_docs: rows }});
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof Error && err.message.startsWith("Invalid status")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("GET /api/ingestion/runs/[runId]/raw failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
