"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Run = {
  ingestion_run_id: string;
  run_no: number;
  status: string;
  stage: string;
  created_at: string;
};

function getReviewHref(run: Run) {
  if (run.stage === "RAW_REVIEW") {
    return `/ingestion/${run.ingestion_run_id}/raw`;
  }
  if (run.stage === "CHUNK_REVIEW") {
    return `/ingestion/${run.ingestion_run_id}/chunks`;
  }
  return `/ingestion/${run.ingestion_run_id}`;
}

export default function IngestionRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPollingRuns, setIsPollingRuns] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const createRun = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const res = await fetch("/api/ingestion/runs", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Failed to create run (${res.status})`);
      }

      const json = await res.json();

      if (!json.success) {
        throw new Error(`Failed to create run: ${json.error}`);
      }

      await loadRuns();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const loadRuns = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const res = await fetch("/api/ingestion/runs", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch runs (${res.status})`);
      }

      const json = await res.json();

      if (json.success) {
        setRuns(json.data.runs ?? []);
      } else {
        throw new Error(json.error || "Failed to load runs");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    const hasRunning = runs.some((run) => run.status === "running");

    if (!hasRunning) {
      setIsPollingRuns(false);
      return;
    }

    setIsPollingRuns(true);

    const interval = setInterval(() => {
      loadRuns(false);
    }, 5000);

    return () => {
      clearInterval(interval);
      setIsPollingRuns(false);
    };
  }, [runs]);

  const hasRunning = runs.some((run) => run.status === "running");

  const filteredRuns = runs.filter((run) => {
    if (statusFilter && run.status !== statusFilter) return false;
    if (stageFilter && run.stage !== stageFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ingestion Runs</h1>
          <p className="text-sm text-gray-500">
            Monitor ingestion lifecycle and open the correct review page by
            stage.
          </p>
        </div>

        <button
          onClick={createRun}
          disabled={isCreating}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {isCreating ? "Creating..." : "Create Run"}
        </button>
      </div>

      {hasRunning && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          One or more ingestion runs are currently in progress. This page
          refreshes automatically.
        </div>
      )}

      {isPollingRuns && (
        <p className="text-xs text-gray-500">
          Auto-refreshing runs every 5 seconds.
        </p>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Always show filters */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Stage</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="FETCHING_RAW">FETCHING_RAW</option>
            <option value="RAW_REVIEW">RAW_REVIEW</option>
            <option value="CHUNKING">CHUNKING</option>
            <option value="CHUNK_REVIEW">CHUNK_REVIEW</option>
            <option value="EMBEDDING">EMBEDDING</option>
            <option value="EMBEDDED">EMBEDDED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        {(statusFilter || stageFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setStageFilter("");
            }}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading runs...</p>
      ) : runs.length === 0 ? (
        <div className="rounded-md border bg-white p-6 text-sm text-gray-500">
          No ingestion runs yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          {filteredRuns.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No runs match the selected filters.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Run No</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Created At</th>
                  <th className="px-4 py-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => (
                  <tr key={run.ingestion_run_id} className="border-t">
                    <td className="px-4 py-3">#{run.run_no}</td>
                    <td className="px-4 py-3">{run.status}</td>
                    <td className="px-4 py-3">{run.stage}</td>
                    <td className="px-4 py-3">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={getReviewHref(run)}
                        className="text-blue-600 hover:underline"
                      >
                        {run.stage === "RAW_REVIEW"
                          ? "Open Raw Review"
                          : run.stage === "CHUNK_REVIEW"
                            ? "Open Chunk Review"
                            : "Open Details"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
