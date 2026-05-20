import Link from "next/link";
import { Database, GitBranch, ShieldCheck } from "lucide-react";

export default function IngestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                AI Governance Demo
              </p>
              <h1 className="text-xl font-semibold tracking-tight">
                Ingestion Control Center
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Overview
            </Link>
            <Link
              href="/ingestion"
              className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800"
            >
              Runs
            </Link>
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Demo-safe
            </span>
            <span className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500 sm:inline-flex">
              <GitBranch className="h-4 w-4" />
              Portfolio Project
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm ring-1 ring-white sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
