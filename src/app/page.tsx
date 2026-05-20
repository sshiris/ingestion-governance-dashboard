import Link from "next/link";
import { ArrowRight, Database, FileCheck2, GitBranch, ShieldCheck } from "lucide-react";

const lifecycle = [
  "FETCHING_RAW",
  "RAW_REVIEW",
  "CHUNKING",
  "CHUNK_REVIEW",
  "EMBEDDING",
  "EMBEDDED",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Portfolio Demo
            </p>
            <h1 className="text-xl font-semibold">AI Ingestion Governance Dashboard</h1>
          </div>
          <Link
            href="/ingestion"
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-7">
            <div className="space-y-4">
              <h2 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Human review gates for governed AI data ingestion.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                A clean demo of an ingestion pipeline console: create runs, review raw documents,
                approve generated chunks, and advance approved content into a demo embedding stage.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <FileCheck2 className="mb-3 h-5 w-5 text-emerald-600" />
                <p className="font-medium">Review Workflow</p>
                <p className="mt-1 text-sm text-slate-500">Approve or reject each pipeline artifact.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <GitBranch className="mb-3 h-5 w-5 text-blue-600" />
                <p className="font-medium">State Machine</p>
                <p className="mt-1 text-sm text-slate-500">Stage transitions enforce governance rules.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Database className="mb-3 h-5 w-5 text-violet-600" />
                <p className="font-medium">Postgres Model</p>
                <p className="mt-1 text-sm text-slate-500">Drizzle schema, migrations, and audit fields.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
              <div>
                <p className="font-medium">Pipeline Lifecycle</p>
                <p className="text-sm text-slate-500">Demo adapters replace proprietary AI services.</p>
              </div>
            </div>
            <ol className="space-y-3">
              {lifecycle.map((stage, index) => (
                <li key={stage} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="font-mono text-sm text-slate-700">{stage}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
