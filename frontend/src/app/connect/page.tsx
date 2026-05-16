"use client";

import { useState } from "react";
import {
  Activity,
  Github,
  Play,
  ArrowUpRight,
  CheckCircle2,
  Link2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RepoInfo {
  full_name: string;
  default_branch: string;
  private: boolean;
  description: string;
}

interface FailedRun {
  id: string;
  name: string;
  branch: string;
  created_at: string;
  html_url: string;
  commit_message: string;
}

type Step = "repo" | "runs" | "analyzing";

export default function ConnectPage() {
  const [step, setStep] = useState<Step>("repo");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [runs, setRuns] = useState<FailedRun[]>([]);
  const [selectedRun, setSelectedRun] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  async function handleValidateRepo() {
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/repo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Cannot access repo");
      }
      const data = await res.json();
      setRepoInfo(data);
      setStep("runs");
      await fetchRuns(repoUrl.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRuns(url: string) {
    try {
      const res = await fetch(`${API_URL}/repo/recent-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: url, limit: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        if (data.runs?.length > 0) setSelectedRun(data.runs[0].id);
      }
    } catch { /* non-fatal */ }
  }

  async function handleAnalyze() {
    if (!selectedRun) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/repo/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl.trim(),
          run_id: selectedRun,
          branch: repoInfo?.default_branch || "main",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start");
      }
      const data = await res.json();
      setWorkflowId(data.workflow_id);
      setStep("analyzing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("repo"); setRepoUrl(""); setRepoInfo(null);
    setRuns([]); setSelectedRun(""); setWorkflowId(null); setError(null);
  }

  return (
    <div className="min-h-screen text-white">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">

        <div className="flex items-start gap-5">
            <div
            className="
                w-16 h-16 rounded-3xl
                bg-gradient-to-br
                from-red-500/20
                to-orange-500/10
                border border-white/10
                flex items-center justify-center
                shadow-[0_0_40px_rgba(255,0,0,0.15)]
            "
            >
            <Github className="text-red-400 drop-shadow-[0_0_10px_rgba(255,80,80,0.5)]" size={30}/>
            </div>

            <div>
            <div className="text-xs tracking-[0.35em] uppercase text-red-300 mb-3">
                Autonomous Recovery
            </div>

            <h1 className="text-5xl font-semibold tracking-tight">
                Connect Repository
            </h1>

            <p className="text-slate-500 mt-4 max-w-2xl leading-relaxed">
                Connect a real GitHub repository, inspect failed CI workflows,
                and launch ARGUS autonomous recovery agents.
            </p>
            </div>
        </div>

        <div
            className="
            premium-card
            px-5 py-4
            rounded-2xl
            border border-white/10
            min-w-[240px]
            "
        >
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Environment Status
            </div>

            <div className="flex items-center gap-3 mt-3">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />

            <span className="text-green-300 font-medium">
                Live & Operational
            </span>
            </div>
        </div>
        </div>

        {/* PROGRESS */}
        <div className="flex items-center gap-4 flex-wrap mb-8">
        {[
            { key: "repo", label: "1. Connect Repo" },
            { key: "runs", label: "2. Pick Failed Run" },
            { key: "analyzing", label: "3. Watch Pipeline" },
        ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-4">
            <div
                className={`px-5 py-3 rounded-2xl border text-sm font-medium transition-all ${
                step === s.key
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : ["repo", "runs", "analyzing"].indexOf(step) > i
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-zinc-500"
                }`}
            >
                {s.label}
            </div>

            {i < 2 && (
                <div className="text-zinc-600 text-xl">
                →
                </div>
            )}
            </div>
        ))}
        </div>

        {/* ERROR */}
        {error && (
        <div
            className="
            mb-8 rounded-2xl
            border border-red-500/20
            bg-red-500/10
            p-4 text-red-300
            "
        >
            ⚠️ {error}
        </div>
        )}

        {/* STEP 1 */}
        {step === "repo" && (
        <div
            className="
            rounded-3xl
            border border-white/10
            bg-white/[0.03]
            backdrop-blur-xl
            p-8
            "
        >
            <h2 className="text-2xl font-semibold text-white">
            Connect a Repository
            </h2>

            <p className="text-slate-500 mt-2">
            Requires <code>GITHUB_TOKEN</code> with
            repo + workflow permissions.
            </p>

            <div className="flex gap-3 mt-6">
            <input
                type="text"
                placeholder="https://github.com/your-username/your-repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) =>
                e.key === "Enter" && handleValidateRepo()
                }
                className="
                flex-1
                bg-black/30
                border border-white/10
                rounded-2xl
                px-5 py-4
                text-white
                placeholder:text-slate-600
                focus:outline-none
                focus:border-red-500/30
                "
            />

            <button
                onClick={handleValidateRepo}
                disabled={loading || !repoUrl.trim()}
                className="btn-primary px-8 py-4 flex items-center gap-2">
                {loading ? "Checking..." : "Connect →"}
            </button>
            </div>
        </div>
        )}

        {/* STEP 2 */}
        {step === "runs" && repoInfo && (
        <div className="space-y-6">

            <div
            className="
                rounded-3xl
                border border-emerald-500/20
                bg-emerald-500/5
                p-6
            "
            >
            <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-400" size={22}/>

                <div>
                <div className="font-medium text-lg">
                    {repoInfo.full_name}
                </div>

                <div className="text-slate-500 text-sm mt-1">
                    Branch: {repoInfo.default_branch}
                </div>
                </div>
            </div>
            </div>

            <div
            className="
                rounded-3xl
                border border-white/10
                bg-white/[0.03]
                backdrop-blur-xl
                p-8
            "
            >
            <h2 className="text-2xl font-semibold">
                Select Failed Run
            </h2>

            <div className="space-y-3 mt-6 max-h-[420px] overflow-y-auto">

                {runs.map((run) => (
                <label
                    key={run.id}
                    className={`
                    block rounded-2xl border
                    p-5 cursor-pointer transition-all
                    ${
                        selectedRun === run.id
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-white/10 bg-white/[0.02]"
                    }
                    `}
                >
                    <input
                    type="radio"
                    checked={selectedRun === run.id}
                    onChange={() => setSelectedRun(run.id)}
                    className="hidden"
                    />

                    <div className="flex justify-between gap-4">
                    <div>
                        <div className="font-medium">
                        {run.name}
                        </div>

                        <div className="text-slate-500 text-sm mt-2">
                        {run.commit_message || "No message"}
                        </div>

                        <div className="text-xs text-slate-600 mt-3">
                        {run.branch} ·{" "}
                        {new Date(run.created_at).toLocaleString()}
                        </div>
                    </div>

                    <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-300 text-sm"
                    >
                        View ↗
                    </a>
                    </div>
                </label>
                ))}
            </div>

            <div className="flex gap-3 mt-8">
                <button
                onClick={reset}
                className="btn-primary px-8 py-4 flex items-center gap-2">
                ← Back
                </button>

                <button
                onClick={handleAnalyze}
                disabled={loading || !selectedRun}
                className="btn-primary px-8 py-4 flex items-center gap-2">
                {loading
                    ? "Starting pipeline..."
                    : "🚀 Analyze & Fix This Run"}
                </button>
            </div>
            </div>
        </div>
        )}

        {/* STEP 3 */}
        {step === "analyzing" && workflowId && (
        <div
            className="
            rounded-3xl
            border border-emerald-500/20
            bg-emerald-500/5
            p-8 backdrop-blur-xl
            "
        >
            <div className="flex items-center gap-2 text-emerald-300 text-xl font-medium">
                <Play size={18} />
                Recovery Pipeline Started
            </div>

            <p className="mt-4 text-slate-500">
            Fetching logs → RCA → Fix generation →
            validation → PR creation.
            </p>

            <div className="mt-6 text-xs font-mono text-slate-600">
            workflow_id: {workflowId}
            </div>

            <div className="flex gap-3 mt-8">
            <a
                href={`/workflows/${workflowId}`}
                className="
                btn-primary px-8 py-4 flex items-center gap-2
                "
            >
                Watch Pipeline Live →
            </a>

            <button
                onClick={reset}
                className="
                btn-primary px-8 py-4 flex items-center gap-2"
            >
                Analyze Another
            </button>
            </div>
        </div>
        )}
    </div>
    );
}