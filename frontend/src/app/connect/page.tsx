"use client";

import { useState } from "react";

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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🔗 Analyze a GitHub Repository</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connect any GitHub repo, pick a failed CI run, and watch the autonomous fix pipeline.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-xs">
        {[
          { key: "repo", label: "1. Connect repo" },
          { key: "runs", label: "2. Pick failed run" },
          { key: "analyzing", label: "3. Watch pipeline" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full border font-medium ${
              step === s.key ? "bg-brand-600 border-brand-500 text-white"
              : ["repo","runs","analyzing"].indexOf(step) > i
              ? "bg-green-900/40 border-green-700 text-green-400"
              : "bg-gray-800 border-gray-700 text-slate-500"
            }`}>{s.label}</span>
            {i < 2 && <span className="text-gray-700">→</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="card border-red-800 bg-red-900/20 text-red-400 text-sm">⚠️ {error}</div>
      )}

      {/* STEP 1 */}
      {step === "repo" && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-white">Enter your GitHub Repository URL</h2>
          <p className="text-xs text-slate-400">
            Requires <code className="text-slate-300">GITHUB_TOKEN</code> in your .env with repo + workflow scopes.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://github.com/your-username/your-repo"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleValidateRepo()}
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm
                         text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600"
            />
            <button onClick={handleValidateRepo} disabled={loading || !repoUrl.trim()} className="btn-primary">
              {loading
                ? <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Checking…
                  </span>
                : "Connect →"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Example: <code className="text-slate-400">https://github.com/ashutoshmm2004/hand-cricket</code>
          </p>
        </div>
      )}

      {/* STEP 2 */}
      {step === "runs" && repoInfo && (
        <div className="space-y-4">
          <div className="card border-green-800 bg-green-900/10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✅</span>
              <span className="font-semibold text-white">{repoInfo.full_name}</span>
              {repoInfo.private && (
                <span className="badge bg-gray-800 text-slate-400 border border-gray-700 text-xs">🔒 private</span>
              )}
            </div>
            <p className="text-xs text-slate-400 ml-6">
              Branch: <code className="text-slate-300">{repoInfo.default_branch}</code>
              {repoInfo.description && ` — ${repoInfo.description}`}
            </p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-white">Select a Failed Run to Analyze</h2>

            {runs.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  No recent failed runs found. Enter a Run ID manually:
                </p>
                <input
                  type="text"
                  placeholder="Run ID — from github.com/.../actions/runs/RUN_ID"
                  value={selectedRun}
                  onChange={e => setSelectedRun(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm
                             text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600"
                />
                <p className="text-xs text-slate-500">
                  Go to your repo → Actions tab → click a failed run → copy the number from the URL
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                {runs.map(run => (
                  <label key={run.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRun === run.id
                      ? "border-brand-600 bg-brand-900/20"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/40"
                  }`}>
                    <input type="radio" name="run" value={run.id}
                      checked={selectedRun === run.id}
                      onChange={() => setSelectedRun(run.id)}
                      className="mt-0.5 accent-brand-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{run.name}</span>
                        <span className="text-xs text-slate-500 font-mono">#{run.id}</span>
                        <span className="badge bg-red-900/40 text-red-400 border border-red-800 text-xs">failed</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{run.commit_message || "No message"}</p>
                      <p className="text-xs text-slate-600">{run.branch} · {new Date(run.created_at).toLocaleString()}</p>
                    </div>
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                       onClick={e => e.stopPropagation()}
                       className="text-xs text-brand-400 hover:underline flex-shrink-0">View ↗</a>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="btn-ghost text-sm">← Back</button>
              <button onClick={handleAnalyze} disabled={loading || !selectedRun} className="btn-primary flex-1">
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Starting pipeline…
                    </span>
                  : "🚀 Analyze & Fix This Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === "analyzing" && workflowId && (
        <div className="card border-green-800 bg-green-900/10 space-y-4">
          <div className="text-green-400 font-semibold text-lg">🚀 Pipeline launched!</div>
          <p className="text-sm text-slate-300">
            Fetching real logs → identifying root cause → generating patches → creating PR on your repo.
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {["📥 Intake","🔍 RCA","🔧 Fix Gen","✅ Validate","🔄 Reflect","📝 Incident"].map(a => (
              <span key={a} className="bg-gray-800 border border-gray-700 px-2 py-1 rounded">{a}</span>
            ))}
          </div>
          <div className="bg-gray-950 rounded-lg px-3 py-2 font-mono text-xs text-slate-400">
            workflow_id: {workflowId}
          </div>
          <div className="flex gap-2">
            <a href={`/workflows/${workflowId}`} className="btn-primary flex-1 text-center">
              Watch Pipeline Live →
            </a>
            <button onClick={reset} className="btn-ghost text-sm">Analyze Another</button>
          </div>
        </div>
      )}
    </div>
  );
}