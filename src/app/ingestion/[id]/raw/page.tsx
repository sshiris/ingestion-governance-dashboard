"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RawDoc = {
  id: string;
  source: string;
  externalId: string;
  title: string;
  storageUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason?: string | null;
};

type RunDetail = {
  ingestion_run_id: string;
  run_no: number;
  status: string;
  stage: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
};

const STATUS_OPTIONS = [
  "",
  "PENDING_REVIEW",
  "APPROVED_RAW",
  "REJECTED",
] as const;

export default function RawReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [runId, setRunId] = useState<string>("");
  const [run, setRun] = useState<RunDetail | null>(null);
  const [docs, setDocs] = useState<RawDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loadingRun, setLoadingRun] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingChunks, setGeneratingChunks] = useState(false);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPollingRun, setIsPollingRun] = useState(false);

  async function generateChunks() {
    try {
      setGeneratingChunks(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/ingestion/runs/${runId}/chunks/generate`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to generate chunks");
      }

      setSuccessMessage(
        "Chunk generation started successfully. Run status will refresh automatically.",
      );

      await Promise.all([loadRun(runId, false), loadDocs(runId, statusFilter)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate chunks",
      );
    } finally {
      setGeneratingChunks(false);
    }
  }

  async function resolveRunId() {
    const { id } = await params;
    setRunId(id);
    return id;
  }

  async function loadRun(id?: string, showLoading = true) {
    try {
      if (showLoading) {
        setLoadingRun(true);
      }

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
      if (showLoading) {
        setLoadingRun(false);
      }
    }
  }
  async function loadDocs(id?: string, nextStatus?: string) {
    try {
      setLoadingDocs(true);
      const currentRunId = id ?? (await resolveRunId());
      const currentStatus = nextStatus ?? statusFilter;

      const query = currentStatus
        ? `?status=${encodeURIComponent(currentStatus)}`
        : "";

      const res = await fetch(
        `/api/ingestion/runs/${currentRunId}/raw${query}`,
        { cache: "no-store" },
      );
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to load raw documents");
      }

      const rows: RawDoc[] = json.data.raw_docs ?? [];
      setDocs(rows);

      if (rows.length > 0) {
        setSelectedDocId((prev) =>
          prev && rows.some((d) => d.id === prev) ? prev : rows[0].id,
        );
      } else {
        setSelectedDocId("");
      }

      setSelectedDocIds((prev) =>
        prev.filter((id) => rows.some((d) => d.id === id)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load raw documents",
      );
    } finally {
      setLoadingDocs(false);
    }
  }

  async function approveDoc(rawDocId: string) {
    try {
      setActionLoadingId(rawDocId);
      setError(null);

      const res = await fetch(`/api/ingestion/runs/${runId}/raw/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawDocId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to approve raw document");
      }

      await Promise.all([loadRun(runId), loadDocs(runId)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve raw document",
      );
    } finally {
      setActionLoadingId(null);
    }
  }
  async function bulkApproveDocs() {
    try {
      setBulkApproving(true);
      setError(null);

      const pendingSelectedIds = docs
        .filter(
          (doc) =>
            selectedDocIds.includes(doc.id) && doc.status === "PENDING_REVIEW",
        )
        .map((doc) => doc.id);

      if (pendingSelectedIds.length === 0) {
        throw new Error("No pending documents selected for approval");
      }

      await Promise.all(
        pendingSelectedIds.map(async (rawDocId) => {
          const res = await fetch(`/api/ingestion/runs/${runId}/raw/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawDocId }),
          });

          const json = await res.json();

          if (!res.ok || !json?.success) {
            throw new Error(
              json?.error ?? "Failed to approve selected documents",
            );
          }
        }),
      );

      setSelectedDocIds([]);
      await Promise.all([loadRun(runId), loadDocs(runId, statusFilter)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to bulk approve documents",
      );
    } finally {
      setBulkApproving(false);
    }
  }

  async function rejectDoc(rawDocId: string) {
    try {
      setActionLoadingId(rawDocId);
      setError(null);

      const reason = window.prompt("Rejection reason (optional):") ?? "";

      const res = await fetch(`/api/ingestion/runs/${runId}/raw/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawDocId,
          reason: reason.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Failed to reject raw document");
      }

      await Promise.all([loadRun(runId), loadDocs(runId)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject raw document",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  function toggleDocSelection(docId: string) {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  }

  function toggleSelectAllPendingDocs() {
    if (allPendingSelected) {
      setSelectedDocIds((prev) =>
        prev.filter((id) => !pendingDocs.some((doc) => doc.id === id)),
      );
      return;
    }

    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      pendingDocs.forEach((doc) => next.add(doc.id));
      return Array.from(next);
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setError(null);
        const { id } = await params;
        if (cancelled) return;

        setRunId(id);
        await Promise.all([loadRun(id), loadDocs(id, "")]);
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

    const interval = setInterval(() => {
      loadRun(runId, false);
    }, 5000);

    return () => {
      clearInterval(interval);
      setIsPollingRun(false);
    };
  }, [runId, run?.status]);

  useEffect(() => {
    if (!run) return;

    if (run.stage === "CHUNK_REVIEW") {
      setSuccessMessage(null);
    }
  }, [run?.stage]);

  const selectedDoc = docs.find((doc) => doc.id === selectedDocId) ?? null;
  const pendingDocs = docs.filter((doc) => doc.status === "PENDING_REVIEW");

  const selectedPendingCount = docs.filter(
    (doc) => selectedDocIds.includes(doc.id) && doc.status === "PENDING_REVIEW",
  ).length;

  const allPendingSelected =
    pendingDocs.length > 0 &&
    pendingDocs.every((doc) => selectedDocIds.includes(doc.id));

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

            <span className="text-gray-700 font-medium">Raw Review</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight">Raw Review</h1>

          {/* Subtitle */}
          <p className="text-sm text-gray-500">
            Review raw documents before chunk generation.
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
          {run.stage === "CHUNKING"
            ? "Chunks are currently being generated. This page refreshes automatically."
            : "This ingestion run is currently in progress. This page refreshes automatically."}
        </div>
      )}

      {run?.status === "pending" && run?.stage === "CHUNKING" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Raw review is complete. Chunk generation is ready to start.
        </div>
      )}

      {run?.status === "pending" && run?.stage === "CHUNK_REVIEW" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Chunk generation completed successfully. Chunks are now ready for
          review.
        </div>
      )}

      {run?.status === "failed" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {run.error_message ?? "Chunk generation failed."}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isPollingRun && (
        <p className="text-xs text-gray-500">
          Auto-refreshing run status every 5 seconds.
        </p>
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

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium" htmlFor="status-filter">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={async (e) => {
              const next = e.target.value;
              setStatusFilter(next);
              await loadDocs(runId, next);
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
      <div className="flex flex-wrap gap-3 rounded-lg border bg-white p-4">
        <button
          type="button"
          onClick={generateChunks}
          disabled={
            generatingChunks ||
            run?.status !== "pending" ||
            run?.stage !== "CHUNKING"
          }
          className="rounded-md bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {generatingChunks
            ? "Starting Chunk Generation..."
            : run?.stage === "CHUNK_REVIEW"
              ? "Chunks Ready for Review"
              : run?.stage === "CHUNKING" && run?.status === "pending"
                ? "Generate Chunks"
              : run?.status === "running"
                ? "Chunking Running..."
                : "Waiting for Raw Review"}
        </button>
        <button
          type="button"
          onClick={bulkApproveDocs}
          disabled={bulkApproving || selectedPendingCount === 0}
          className="rounded-md bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {bulkApproving
            ? "Bulk Approving..."
            : `Bulk Approve (${selectedPendingCount})`}
        </button>

        {run?.stage === "CHUNK_REVIEW" && (
          <Link
            href={`/ingestion/${runId}/chunks`}
            className="rounded-md bg-black px-4 py-2 text-white"
          >
            Open Chunk Review
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Raw Documents</h2>

            {docs.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleSelectAllPendingDocs}
                />
                Select all pending
              </label>
            )}
          </div>

          {loadingDocs ? (
            <div className="p-4 text-sm text-gray-500">
              Loading documents...
            </div>
          ) : docs.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No documents found.</div>
          ) : (
            <div className="divide-y">
              {docs.map((doc) => {
                const isPending = doc.status === "PENDING_REVIEW";
                const isChecked = selectedDocIds.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`flex gap-3 p-4 hover:bg-gray-50 ${
                      selectedDocId === doc.id ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isPending}
                        onChange={() => toggleDocSelection(doc.id)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedDocId(doc.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-500">
                            {doc.source} · {doc.externalId}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border px-2 py-1 text-xs">
                          {doc.status}
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
            <h2 className="font-medium">Document Details</h2>
          </div>

          {!selectedDoc ? (
            <div className="p-4 text-sm text-gray-500">
              Select a raw document to view details.
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Title:</span>{" "}
                  {selectedDoc.title}
                </div>
                <div>
                  <span className="font-medium">Source:</span>{" "}
                  {selectedDoc.source}
                </div>
                <div>
                  <span className="font-medium">External ID:</span>{" "}
                  {selectedDoc.externalId}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {selectedDoc.status}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(selectedDoc.createdAt).toLocaleString()}
                </div>
                {selectedDoc.publishedAt && (
                  <div>
                    <span className="font-medium">Published:</span>{" "}
                    {new Date(selectedDoc.publishedAt).toLocaleString()}
                  </div>
                )}
                {selectedDoc.reviewedAt && (
                  <div>
                    <span className="font-medium">Reviewed At:</span>{" "}
                    {new Date(selectedDoc.reviewedAt).toLocaleString()}
                  </div>
                )}
                {selectedDoc.reviewedBy && (
                  <div>
                    <span className="font-medium">Reviewed By:</span>{" "}
                    {selectedDoc.reviewedBy}
                  </div>
                )}
                {selectedDoc.rejectionReason && (
                  <div className="text-red-600">
                    <span className="font-medium">Rejection Reason:</span>{" "}
                    {selectedDoc.rejectionReason}
                  </div>
                )}
                {selectedDoc.storageUrl && (
                  <div className="break-all">
                    <span className="font-medium">Storage URL:</span>{" "}
                    <a
                      href={selectedDoc.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      Open original document
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={
                    selectedDoc.status !== "PENDING_REVIEW" ||
                    actionLoadingId === selectedDoc.id
                  }
                  onClick={() => approveDoc(selectedDoc.id)}
                  className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {actionLoadingId === selectedDoc.id
                    ? "Working..."
                    : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={
                    selectedDoc.status !== "PENDING_REVIEW" ||
                    actionLoadingId === selectedDoc.id
                  }
                  onClick={() => rejectDoc(selectedDoc.id)}
                  className="rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {actionLoadingId === selectedDoc.id ? "Working..." : "Reject"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
