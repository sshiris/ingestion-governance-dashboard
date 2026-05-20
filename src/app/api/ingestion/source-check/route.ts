import { importDiscoveredDocuments } from "@/server/services/ingestions/ingestion-source-service";
import { NextResponse } from "next/server";

type DemoDocument = {
  externalId: string;
  title: string;
  storageUrl: string;
  publishedAt: string;
};

const SAMPLE_DOCUMENTS: DemoDocument[] = [
  {
    externalId: "demo-policy-001",
    title: "Model Risk Policy Update",
    storageUrl: "https://example.invalid/demo/model-risk-policy-update",
    publishedAt: "2026-01-12T09:00:00.000Z",
  },
  {
    externalId: "demo-controls-002",
    title: "Data Quality Control Checklist",
    storageUrl: "https://example.invalid/demo/data-quality-control-checklist",
    publishedAt: "2026-01-16T09:00:00.000Z",
  },
  {
    externalId: "demo-audit-003",
    title: "Ingestion Audit Evidence Guide",
    storageUrl: "https://example.invalid/demo/ingestion-audit-evidence-guide",
    publishedAt: "2026-01-20T09:00:00.000Z",
  },
];

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const source = typeof body.source === "string" ? body.source : "DEMO_SOURCE";
  const documents = Array.isArray(body.documents) && body.documents.length > 0
    ? body.documents
    : SAMPLE_DOCUMENTS;

  const result = await importDiscoveredDocuments({
    source,
    documents,
  });

  return NextResponse.json({
    success: true,
    data: result,
  });
}
