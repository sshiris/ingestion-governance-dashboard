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

type CategoryJson = {
  type: string;
  source: string;
  category: string;
}

type Chunk = {
  id: string;
  rawDocId: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  textHash: string;
  categoryJson: CategoryJson;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  source: string;
  externalId: string;
  title: string;
  runId: string;
};

const STATUS_OPTIONS = [
  "",
  "PENDING_REVIEW",
  "APPROVED_CHUNK",
  "REJECTED",
] as const;

export default function ChunkReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<RunDetail | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState("");
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingRun, setLoadingRun] = useState(true);
  const [loadingChunks, setLoadingChunks] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPollingRun, setIsPollingRun] = useState(false);

  async function resolveRunId() {
    const { id } = await params;
    setRunId(id);
    return id;
  }

  async function loadRun(id?: string, showLoading = true) {
    try {
      if (showLoading) setLoadingRun(true);

      const currentRunId = id ?? (await resolveRunId());

      const res = await fetch(`/api/ingestion/runs/${currentRunId}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to load run");
      }

      setRun(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run");
    } finally {
      setLoadingRun(false);
    }
  }

  async function loadChunks(id?: string, nextStatus?: string) {
    try {
      setLoadingChunks(true);

      const currentRunId = id ?? (await resolveRunId());
      const currentStatus = nextStatus ?? statusFilter;
      const query = currentStatus
        ? `?status=${encodeURIComponent(currentStatus)}`
        : "";

      const res = await fetch(
        `/api/ingestion/runs/${currentRunId}/chunks${query}`,
        { cache: "no-store" },
      );
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to load chunks");
      }

      const rows: Chunk[] = json.data.chunks ?? [];
      setChunks(rows);

      if (rows.length > 0) {
        setSelectedChunkId((prev) =>
          prev && rows.some((chunk) => chunk.id === prev) ? prev : rows[0].id,
        );
      } else {
        setSelectedChunkId("");
      }

      setSelectedChunkIds((prev) =>
        prev.filter((id) => rows.some((chunk) => chunk.id === id)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chunks");
    } finally {
      setLoadingChunks(false);
    }
  }

  async function approveChunk(chunkId: string) {
    try {
      setActionLoadingId(chunkId);
      setError(null);

      const res = await fetch(`/api/ingestion/runs/${runId}/chunks/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chunkId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to approve chunk");
      }

      await Promise.all([loadRun(runId), loadChunks(runId, statusFilter)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve chunk");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function bulkApproveChunks() {
    try {
      setBulkApproving(true);
      setError(null);

      const pendingSelectedIds = chunks
        .filter(
          (chunk) =>
            selectedChunkIds.includes(chunk.id) &&
            chunk.status === "PENDING_REVIEW",
        )
        .map((chunk) => chunk.id);

      if (pendingSelectedIds.length === 0) {
        throw new Error("No pending chunks selected for approval");
      }

      await Promise.all(
        pendingSelectedIds.map(async (chunkId) => {
          const res = await fetch(
            `/api/ingestion/runs/${runId}/chunks/approve`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ chunkId }),
            },
          );

          const json = await res.json();

          if (!res.ok || !json?.success) {
            throw new Error(json?.error ?? "Failed to approve selected chunks");
          }
        }),
      );

      setSelectedChunkIds([]);
      await Promise.all([loadRun(runId), loadChunks(runId, statusFilter)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to bulk approve chunks",
      );
    } finally {
      setBulkApproving(false);
    }
  }

  async function rejectChunk(chunkId: string) {
    try {
      setActionLoadingId(chunkId);
      setError(null);

      const reason = window.prompt("Rejection reason (optional):") ?? "";

      const res = await fetch(`/api/ingestion/runs/${runId}/chunks/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunkId,
          reason: reason.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to reject chunk");
      }

      await Promise.all([loadRun(runId), loadChunks(runId, statusFilter)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject chunk");
    } finally {
      setActionLoadingId(null);
    }
  }

  function toggleChunkSelection(chunkId: string) {
    setSelectedChunkIds((prev) =>
      prev.includes(chunkId)
        ? prev.filter((id) => id !== chunkId)
        : [...prev, chunkId],
    );
  }

  function toggleSelectAllPendingChunks() {
    if (allPendingSelected) {
      setSelectedChunkIds((prev) =>
        prev.filter((id) => !pendingChunks.some((chunk) => chunk.id === id)),
      );
      return;
    }

    setSelectedChunkIds((prev) => {
      const next = new Set(prev);
      pendingChunks.forEach((chunk) => next.add(chunk.id));
      return Array.from(next);
    });
  }

  async function generateEmbeddings() {
    try {
      setGeneratingEmbeddings(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(
        `/api/ingestion/runs/${runId}/embeddings/generate`,
        {
          method: "POST",
        },
      );
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to generate embeddings");
      }

      setSuccessMessage(
        "Embedding request started successfully. Run status will refresh automatically.",
      );

      await loadRun(runId, false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate embeddings",
      );
    } finally {
      setGeneratingEmbeddings(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setError(null);
        const { id } = await params;
        if (cancelled) return;

        setRunId(id);
        await Promise.all([loadRun(id), loadChunks(id, "")]);
      } catch {
        if (!cancelled) {
          setError("Failed to initialize page");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!runId || !run || run.status !== "running") {
      setIsPollingRun(false);
      return;
    }
    setIsPollingRun(true);

    const interval = setInterval(async () => {
      loadRun(runId, false);
    }, 5000);

    return () => {
      clearInterval(interval);
      setIsPollingRun(false);
    };
  }, [runId, run?.status]);

  useEffect(() => {
    if (!run) return;

    if (run.status === "completed" || run.status === "failed") {
      setSuccessMessage(null);
    }
  }, [run?.status]);

  const selectedChunk =
    chunks.find((chunk) => chunk.id === selectedChunkId) ?? null;

  const pendingChunks = chunks.filter(
    (chunk) => chunk.status === "PENDING_REVIEW",
  );

  const selectedPendingCount = chunks.filter(
    (chunk) =>
      selectedChunkIds.includes(chunk.id) && chunk.status === "PENDING_REVIEW",
  ).length;

  const allPendingSelected =
    pendingChunks.length > 0 &&
    pendingChunks.every((chunk) => selectedChunkIds.includes(chunk.id));

  const allVisibleChunksRejected =
    chunks.length > 0 && chunks.every((chunk) => chunk.status === "REJECTED");

  const canGenerateEmbeddings =
    run?.status === "pending" && run?.stage === "EMBEDDING";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Link
              href="/ingestion"
              className="hover:text-gray-700 hover:underline"
            >
              Runs
            </Link>

            <span>/</span>

            <Link
              href={`/ingestion/${runId}`}
              className="hover:text-gray-700 hover:underline"
            >
              Run #{run?.run_no}
            </Link>

            <span>/</span>

            <span className="text-gray-700 font-medium">Chunk Review</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight">
            Chunk Review
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-gray-500">
            Review generated chunks for this ingestion run.
          </p>
        </div>
      </div>
      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {run?.status === "running" && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {run.stage === "EMBEDDING"
            ? "Embeddings are currently being generated. This page refreshes automatically."
            : "This ingestion run is currently in progress. This page refreshes automatically."}
        </div>
      )}

      {run?.status === "pending" && run.stage === "EMBEDDING" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Chunk review is complete. Embedding generation is ready to start.
        </div>
      )}

      {run?.status === "completed" && run.stage === "EMBEDDED" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Embeddings completed successfully.
        </div>
      )}

      {run?.status === "failed" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {run.error_message ?? "Embedding generation failed."}
        </div>
      )}

      {run?.status !== "failed" && allVisibleChunksRejected && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          All chunks in this view are rejected. Embedding generation cannot
          start without at least one approved chunk.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-4">
        {loadingRun ? (
          <p className="text-sm text-gray-500">Loading run...</p>
        ) : run ? (
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="font-medium">Run No:</span> #{run.run_no}
            </div>
            <div>
              <span className="font-medium">Status:</span> {run.status}
            </div>
            <div>
              <span className="font-medium">Stage:</span> {run.stage}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{" "}
              {new Date(run.updated_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Run not found.</p>
        )}
      </div>
      {isPollingRun && (
        <p className="text-xs text-gray-500">
          Auto-refreshing run status every 5 seconds.
        </p>
      )}

      <div className="flex flex-wrap gap-3 rounded-lg border bg-white p-4">
        <button
          type="button"
          onClick={generateEmbeddings}
          disabled={generatingEmbeddings || !canGenerateEmbeddings}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {generatingEmbeddings
            ? "Starting Embeddings..."
            : run?.status === "failed"
              ? "Embedding Disabled"
            : run?.stage === "EMBEDDED"
              ? "Embeddings Completed"
              : canGenerateEmbeddings
                ? "Generate Embeddings"
              : run?.status === "running"
                ? "Embeddings Running..."
                : "Waiting for Chunk Review"}
        </button>

        <button
          type="button"
          onClick={bulkApproveChunks}
          disabled={bulkApproving || selectedPendingCount === 0}
          className="rounded-md bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {bulkApproving
            ? "Bulk Approving..."
            : `Approve Selected (${selectedPendingCount})`}
        </button>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium" htmlFor="chunk-status-filter">
            Filter by status
          </label>
          <select
            id="chunk-status-filter"
            value={statusFilter}
            onChange={async (e) => {
              const next = e.target.value;
              setStatusFilter(next);
              await loadChunks(runId, next);
            }}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.filter(Boolean).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Chunks</h2>

            {chunks.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleSelectAllPendingChunks}
                />
                Select all pending
              </label>
            )}
          </div>

          {loadingChunks ? (
            <div className="p-4 text-sm text-gray-500">Loading chunks...</div>
          ) : chunks.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No chunks found.</div>
          ) : (
            <div className="divide-y">
              {chunks.map((chunk) => {
                const isPending = chunk.status === "PENDING_REVIEW";
                const isChecked = selectedChunkIds.includes(chunk.id);

                return (
                  <div
                    key={chunk.id}
                    className={`flex gap-3 p-4 hover:bg-gray-50 ${
                      selectedChunkId === chunk.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isPending}
                        onChange={() => toggleChunkSelection(chunk.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedChunkId(chunk.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {chunk.title} · Chunk #{chunk.chunkIndex}
                          </p>
                          <p className="text-xs text-gray-500">
                            {chunk.source} · {chunk.externalId}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border px-2 py-1 text-xs">
                          {chunk.status}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="font-medium">Chunk Details</h2>
          </div>

          {!selectedChunk ? (
            <div className="p-4 text-sm text-gray-500">
              Select a chunk to view details.
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Title:</span>{" "}
                  {selectedChunk.title}
                </div>
                <div>
                  <span className="font-medium">Chunk ID:</span>{" "}
                  {selectedChunk.chunkId}
                </div>
                <div>
                  <span className="font-medium">Chunk Index:</span>{" "}
                  {selectedChunk.chunkIndex}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {selectedChunk.status}
                </div>
                <div>
                  <span className="font-medium">Source:</span>{" "}
                  {selectedChunk.source}
                </div>
                <div>
                  <span className="font-medium">External ID:</span>{" "}
                  {selectedChunk.externalId}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(selectedChunk.createdAt).toLocaleString()}
                </div>
                {selectedChunk.reviewedAt && (
                  <div>
                    <span className="font-medium">Reviewed At:</span>{" "}
                    {new Date(selectedChunk.reviewedAt).toLocaleString()}
                  </div>
                )}
                {selectedChunk.reviewedBy && (
                  <div>
                    <span className="font-medium">Reviewed By:</span>{" "}
                    {selectedChunk.reviewedBy}
                  </div>
                )}
                {selectedChunk.rejectionReason && (
                  <div className="text-red-600">
                    <span className="font-medium">Rejection Reason:</span>{" "}
                    {selectedChunk.rejectionReason}
                  </div>
                )}
                <div>
                  <span className="font-medium">Text Hash:</span>{" "}
                  {selectedChunk.textHash}
                </div>
                <div>
                  <span className="font-medium">Categories:</span>
                  <p><strong>Type: </strong>{selectedChunk.categoryJson.type}</p>
                  <p><strong>Source: </strong>{selectedChunk.categoryJson.source}</p>
                  <p><strong>Category: </strong>{selectedChunk.categoryJson.category}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Chunk Text</p>
                <div className="max-h-72 overflow-y-auto rounded border bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                  {selectedChunk.text}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={
                    selectedChunk.status !== "PENDING_REVIEW" ||
                    actionLoadingId === selectedChunk.id
                  }
                  onClick={() => approveChunk(selectedChunk.id)}
                  className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {actionLoadingId === selectedChunk.id
                    ? "Working..."
                    : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={
                    selectedChunk.status !== "PENDING_REVIEW" ||
                    actionLoadingId === selectedChunk.id
                  }
                  onClick={() => rejectChunk(selectedChunk.id)}
                  className="rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {actionLoadingId === selectedChunk.id
                    ? "Working..."
                    : "Reject"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
