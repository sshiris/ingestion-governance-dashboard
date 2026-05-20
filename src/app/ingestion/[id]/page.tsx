"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RunDetail = {
  ingestion_run_id: string;
  run_no: number;
  status: string;
  stage: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
};

export default function IngestionRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [isPollingRun, setIsPollingRun] = useState(false);

  async function loadRun(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const { id } = await params;

      const res = await fetch(`/api/ingestion/runs/${id}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to load ingestion run");
      }

      setRun(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load ingestion run",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function seedRawDocs() {
    try {
      setSeeding(true);
      setError(null);

      const { id } = await params;

      const res = await fetch(`/api/ingestion/runs/${id}/raw/seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count: 5 }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to seed raw docs");
      }

      await loadRun(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed raw docs");
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    loadRun();
  }, [params]);

  useEffect(() => {
    if (!run || run.status !== "running") {
      setIsPollingRun(false);
      return;
    }

    setIsPollingRun(true);

    const interval = setInterval(() => {
      loadRun(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      setIsPollingRun(false);
    };
  }, [run?.status]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading run details...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!run) {
    return (
      <div className="rounded-md border bg-white p-6 text-sm text-gray-500">
        Run not found.
      </div>
    );
  }

  const rawReviewHref = `/ingestion/${run.ingestion_run_id}/raw`;
  const chunkReviewHref = `/ingestion/${run.ingestion_run_id}/chunks`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Link
            href="/ingestion"
            className="hover:text-gray-700 hover:underline"
          >
            Runs
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-700">Run #{run.run_no}</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Ingestion Run #{run.run_no}
        </h1>

        <p className="text-sm text-gray-500">
          Run detail view for monitoring ingestion lifecycle.
        </p>
      </div>

      {run.status === "running" && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {run.stage === "FETCHING_RAW"
            ? "Raw document fetching is currently in progress. This page refreshes automatically."
            : run.stage === "CHUNKING"
              ? "Chunk generation is currently in progress. This page refreshes automatically."
              : run.stage === "EMBEDDING"
                ? "Embeddings are currently being generated. This page refreshes automatically."
                : "This ingestion run is currently in progress. This page refreshes automatically."}
        </div>
      )}

      {run.status === "pending" && run.stage === "CHUNKING" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Raw review is complete. Chunk generation is ready to start.
        </div>
      )}

      {run.status === "pending" && run.stage === "EMBEDDING" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Chunk review is complete. Embedding generation is ready to start.
        </div>
      )}

      {run.status === "completed" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {run.stage === "EMBEDDED"
            ? "Embedding generation completed successfully."
            : "This ingestion run completed successfully."}
        </div>
      )}

      {run.status === "failed" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {run.error_message ?? "This ingestion run failed."}
        </div>
      )}

      {isPollingRun && (
        <p className="text-xs text-gray-500">
          Auto-refreshing run status every 5 seconds.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <tbody>
            <tr className="border-t">
              <td className="w-48 px-4 py-3 font-medium">Run No</td>
              <td className="px-4 py-3">#{run.run_no}</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3 font-medium">Status</td>
              <td className="px-4 py-3">{run.status}</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3 font-medium">Stage</td>
              <td className="px-4 py-3">{run.stage}</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3 font-medium">Created At</td>
              <td className="px-4 py-3">
                {new Date(run.created_at).toLocaleString()}
              </td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3 font-medium">Updated At</td>
              <td className="px-4 py-3">
                {new Date(run.updated_at).toLocaleString()}
              </td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3 font-medium">Error Message</td>
              <td className="px-4 py-3">
                {run.error_message ? (
                  <span className="text-red-600">{run.error_message}</span>
                ) : (
                  <span className="text-gray-500">None</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Test Actions</h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedRawDocs}
            disabled={
              seeding || run.stage !== "FETCHING_RAW" || run.status !== "running"
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "Seed Raw Docs (Test)"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Review Links</h2>

        <div className="flex flex-wrap gap-3">
          {run.stage === "RAW_REVIEW" && (
            <Link
              href={rawReviewHref}
              className="rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              Open Raw Review Page
            </Link>
          )}

          {run.stage === "CHUNKING" && (
            <Link
              href={rawReviewHref}
              className="rounded-md bg-purple-600 px-4 py-2 text-white"
            >
              Open Chunk Trigger
            </Link>
          )}

          {run.stage === "CHUNK_REVIEW" && (
            <Link
              href={chunkReviewHref}
              className="rounded-md bg-purple-600 px-4 py-2 text-white"
            >
              Open Chunk Review Page
            </Link>
          )}

          {run.stage === "EMBEDDING" && (
            <Link
              href={chunkReviewHref}
              className="rounded-md bg-black px-4 py-2 text-white"
            >
              Open Embedding Trigger
            </Link>
          )}
        </div>

        {run.stage !== "RAW_REVIEW" &&
          run.stage !== "CHUNKING" &&
          run.stage !== "CHUNK_REVIEW" &&
          run.stage !== "EMBEDDING" && (
          <p className="text-sm text-gray-500">
            No review page is available for the current stage.
          </p>
        )}
      </div>
    </div>
  );
}
