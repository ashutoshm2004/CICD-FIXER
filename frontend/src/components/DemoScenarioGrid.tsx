"use client";

import { useState } from "react";
import { Loader2, Play, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SCENARIOS = [
  {
    key: "env_missing",
    label: "Missing Env Var",
    description: "DATABASE_URL not set → Python KeyError",
    difficulty: "Easy",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    key: "dep_conflict",
    label: "Dependency Conflict",
    description: "numpy==1.24 conflicts with torch>=2.0",
    difficulty: "Medium",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    key: "docker_build",
    label: "Docker Build Fail",
    description: "COPY config/production.yaml — file missing",
    difficulty: "Medium",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    key: "ts_error",
    label: "TypeScript Error",
    description: "UserRecord[] not assignable to Record<string,unknown>[]",
    difficulty: "Hard",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  {
    key: "test_failure",
    label: "Test Failure",
    description: "pytest fails — fee calculation changed after refactor",
    difficulty: "Hard",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
] as const;

type ScenarioKey = (typeof SCENARIOS)[number]["key"];

interface RunState {
  status: "idle" | "loading" | "running" | "done" | "error";
  workflowId?: string;
  error?: string;
}

export default function DemoScenarioGrid() {
  const [runs, setRuns] = useState<Record<ScenarioKey, RunState>>(
    Object.fromEntries(SCENARIOS.map((s) => [s.key, { status: "idle" }])) as Record<ScenarioKey, RunState>
  );

  async function trigger(key: ScenarioKey) {
    setRuns((prev) => ({ ...prev, [key]: { status: "loading" } }));

    try {
      const res = await fetch(`${API}/demo/trigger/${key}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Trigger failed");
      }
      const data = await res.json();
      setRuns((prev) => ({ ...prev, [key]: { status: "done", workflowId: data.workflow_id } }));
    } catch (e: unknown) {
      setRuns((prev) => ({
        ...prev,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Failed" },
      }));
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {SCENARIOS.map((scenario) => {
        const run = runs[scenario.key];

        return (
          <div
            key={scenario.key}
            className="panel rounded-[24px] p-6 flex flex-col justify-between gap-5"
          >
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold mb-4 ${scenario.bg} ${scenario.color}`}>
                {scenario.difficulty}
              </div>
              <h3 className="text-white font-bold mb-1">{scenario.label}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{scenario.description}</p>
            </div>

            <div>
              {run.status === "idle" && (
                <button
                  onClick={() => trigger(scenario.key)}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
                >
                  <Play size={14} />
                  Run Scenario
                </button>
              )}

              {run.status === "loading" && (
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm py-3">
                  <Loader2 size={14} className="animate-spin" />
                  Starting…
                </div>
              )}

              {run.status === "done" && run.workflowId && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 size={14} />
                    Pipeline running
                  </div>
                  <a
                    href={`/workflows/${run.workflowId}`}
                    className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink size={13} />
                    View Progress
                  </a>
                  <button
                    onClick={() => setRuns((prev) => ({ ...prev, [scenario.key]: { status: "idle" } }))}
                    className="w-full text-center text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                  >
                    Run again
                  </button>
                </div>
              )}

              {run.status === "error" && (
                <div className="space-y-2">
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle size={12} /> {run.error}
                  </p>
                  <button
                    onClick={() => trigger(scenario.key)}
                    className="btn-primary w-full py-2.5 text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
