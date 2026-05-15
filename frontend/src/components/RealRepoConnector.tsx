"use client";

import { useState } from "react";
import {
  Github,
  KeyRound,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Play,
  ExternalLink,
} from "lucide-react";

// ------------------------------------------------------------------ //
// Types                                                               //
// ------------------------------------------------------------------ //

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
}

interface Repo {
  full_name: string;
  owner: string;
  name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

interface FailedRun {
  id: string;
  name: string;
  head_branch: string;
  head_sha: string;
  created_at: string;
  html_url: string;
}

type Step = "token" | "repo" | "run" | "triggering" | "done";

// ------------------------------------------------------------------ //
// Helpers                                                             //
// ------------------------------------------------------------------ //

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ------------------------------------------------------------------ //
// Sub-components                                                       //
// ------------------------------------------------------------------ //

function StepBadge({ current, step, label }: { current: Step; step: Step; label: string }) {
  const steps: Step[] = ["token", "repo", "run", "triggering", "done"];
  const ci = steps.indexOf(current);
  const si = steps.indexOf(step);
  const done = ci > si;
  const active = ci === si;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
          done
            ? "bg-green-500/20 border-green-500/40 text-green-400"
            : active
            ? "bg-red-500/20 border-red-500/50 text-red-400"
            : "bg-white/5 border-white/10 text-zinc-500"
        }`}
      >
        {done ? <CheckCircle2 size={14} /> : si + 1}
      </div>
      <span
        className={`text-xs uppercase tracking-widest ${
          active ? "text-white" : done ? "text-green-400" : "text-zinc-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Main component                                                       //
// ------------------------------------------------------------------ //

export default function RealRepoConnector({
  onWorkflowStarted,
}: {
  onWorkflowStarted?: (workflowId: string) => void;
}) {
  // Step state
  const [step, setStep] = useState<Step>("token");

  // Token step
  const [token, setToken] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);

  // Repo step
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [repoSearch, setRepoSearch] = useState("");

  // Run step
  const [runs, setRuns] = useState<FailedRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<FailedRun | null>(null);

  // Trigger step
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  // ---------------------------------------------------------------- //
  // Handlers                                                          //
  // ---------------------------------------------------------------- //

  async function handleConnectToken() {
    if (!token.trim()) return;
    setTokenLoading(true);
    setTokenError(null);

    try {
      const data = await apiFetch<{ login: string; name: string; avatar_url: string; public_repos: number }>(
        `/demo/github/user?token=${encodeURIComponent(token)}`
      );
      setUser(data);

      // Fetch repos immediately
      setReposLoading(true);
      const repoData = await apiFetch<{ repos: Repo[] }>(
        `/demo/github/repos?token=${encodeURIComponent(token)}`
      );
      setRepos(repoData.repos);
      setReposLoading(false);
      setStep("repo");
    } catch (e: unknown) {
      setTokenError(e instanceof Error ? e.message : "Token validation failed");
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleSelectRepo(repo: Repo) {
    setSelectedRepo(repo);
    setSelectedRun(null);
    setRuns([]);
    setStep("run");
    setRunsLoading(true);

    try {
      const data = await apiFetch<{ runs: FailedRun[] }>(
        `/demo/github/runs?token=${encodeURIComponent(token)}&owner=${repo.owner}&repo=${repo.name}`
      );
      setRuns(data.runs);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }

  async function handleTrigger() {
    if (!selectedRepo || !selectedRun) return;
    setStep("triggering");
    setTriggerError(null);

    try {
      const res = await fetch(`${API}/demo/real/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          run_id: selectedRun.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Trigger failed");
      }

      const data = await res.json();
      setWorkflowId(data.workflow_id);
      setStep("done");
      onWorkflowStarted?.(data.workflow_id);
    } catch (e: unknown) {
      setTriggerError(e instanceof Error ? e.message : "Failed to start pipeline");
      setStep("run"); // go back so user can retry
    }
  }

  // ---------------------------------------------------------------- //
  // Derived                                                           //
  // ---------------------------------------------------------------- //

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  // ---------------------------------------------------------------- //
  // Render                                                            //
  // ---------------------------------------------------------------- //

  return (
    <div className="panel rounded-[28px] p-7 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Github size={20} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Real Repo Mode</h2>
          <p className="text-zinc-500 text-xs">Connect your GitHub account to fix real CI/CD failures</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-6 pb-2 border-b border-white/5">
        <StepBadge current={step} step="token" label="Token" />
        <div className="flex-1 h-px bg-white/5" />
        <StepBadge current={step} step="repo" label="Repo" />
        <div className="flex-1 h-px bg-white/5" />
        <StepBadge current={step} step="run" label="Run" />
        <div className="flex-1 h-px bg-white/5" />
        <StepBadge current={step} step="done" label="Analyse" />
      </div>

      {/* ── STEP 1: Token ── */}
      {(step === "token" || (step !== "token" && user)) && (
        <div className={step !== "token" ? "opacity-60 pointer-events-none" : ""}>
          <label className="muted-label mb-3 block">
            <KeyRound size={12} className="inline mr-1" />
            GitHub Personal Access Token
          </label>

          {user ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <img src={user.avatar_url} className="w-8 h-8 rounded-full" alt="" />
              <div>
                <p className="text-white text-sm font-semibold">{user.name ?? user.login}</p>
                <p className="text-zinc-400 text-xs">@{user.login} · {user.public_repos} repos</p>
              </div>
              <CheckCircle2 size={16} className="text-green-400 ml-auto" />
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnectToken()}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="
                  flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                  text-white text-sm placeholder:text-zinc-600
                  focus:outline-none focus:border-red-500/50 transition-colors
                "
              />
              <button
                onClick={handleConnectToken}
                disabled={tokenLoading || !token.trim()}
                className="btn-primary px-5 py-3 flex items-center gap-2 disabled:opacity-50"
              >
                {tokenLoading ? <Loader2 size={15} className="animate-spin" /> : "Connect"}
              </button>
            </div>
          )}

          {tokenError && (
            <p className="mt-2 text-red-400 text-xs flex items-center gap-1">
              <AlertCircle size={12} /> {tokenError}
            </p>
          )}

          {!user && (
            <p className="mt-2 text-zinc-600 text-xs">
              Needs <code className="text-zinc-400">repo</code> and{" "}
              <code className="text-zinc-400">actions:read</code> scopes.{" "}
              <a
                href="https://github.com/settings/tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline"
              >
                Create token ↗
              </a>
            </p>
          )}
        </div>
      )}

      {/* ── STEP 2: Repo selector ── */}
      {step === "repo" && (
        <div>
          <label className="muted-label mb-3 block">Select Repository</label>

          {reposLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading repositories…
            </div>
          ) : (
            <>
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Filter repositories…"
                className="
                  w-full mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                  text-white text-sm placeholder:text-zinc-600
                  focus:outline-none focus:border-red-500/50 transition-colors
                "
              />

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredRepos.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">No repositories found.</p>
                )}
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.full_name}
                    onClick={() => handleSelectRepo(repo)}
                    className="
                      w-full flex items-center justify-between
                      px-4 py-3 rounded-xl
                      bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/20
                      text-left transition-all
                    "
                  >
                    <span className="text-sm text-white font-medium">{repo.full_name}</span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      {repo.private ? "private" : "public"}
                      <ChevronDown size={12} className="-rotate-90" />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: Run selector ── */}
      {step === "run" && selectedRepo && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="muted-label">Failed Runs — {selectedRepo.full_name}</label>
            <button
              onClick={() => { setStep("repo"); setSelectedRepo(null); }}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              ← Change repo
            </button>
          </div>

          {triggerError && (
            <p className="mb-3 text-red-400 text-xs flex items-center gap-1">
              <AlertCircle size={12} /> {triggerError}
            </p>
          )}

          {runsLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> Fetching failed runs…
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500/50" />
              <p className="text-sm">No failed runs found in this repo. 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`
                    w-full flex items-center justify-between
                    px-4 py-3 rounded-xl border text-left transition-all
                    ${
                      selectedRun?.id === run.id
                        ? "bg-red-500/15 border-red-500/40"
                        : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                    }
                  `}
                >
                  <div>
                    <p className="text-sm text-white font-medium">{run.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {run.head_branch} · {formatDate(run.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={run.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                    {selectedRun?.id === run.id && (
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedRun && (
            <button
              onClick={handleTrigger}
              className="btn-primary w-full mt-5 py-3.5 flex items-center justify-center gap-2"
            >
              <Play size={15} />
              Analyse &amp; Fix Run #{selectedRun.id}
            </button>
          )}
        </div>
      )}

      {/* ── STEP 4: Triggering ── */}
      {step === "triggering" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 size={36} className="text-red-500 animate-spin" />
          <p className="text-white font-semibold">Starting pipeline…</p>
          <p className="text-zinc-500 text-sm text-center">
            Fetching logs from GitHub Actions and spinning up the agent graph.
          </p>
        </div>
      )}

      {/* ── STEP 5: Done ── */}
      {step === "done" && workflowId && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Pipeline Running</p>
            <p className="text-zinc-400 text-sm mt-1">
              Agents are analysing your failure and generating a fix.
            </p>
          </div>
          <a
            href={`/workflows/${workflowId}`}
            className="btn-primary px-8 py-3 flex items-center gap-2"
          >
            <ExternalLink size={15} />
            View Live Progress
          </a>
          <button
            onClick={() => {
              setStep("token");
              setToken("");
              setUser(null);
              setRepos([]);
              setSelectedRepo(null);
              setRuns([]);
              setSelectedRun(null);
              setWorkflowId(null);
            }}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Analyse another run
          </button>
        </div>
      )}
    </div>
  );
}
