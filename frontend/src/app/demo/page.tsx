"use client";

import { useEffect, useState } from "react";
import { listScenarios, triggerDemo, resetDemo } from "@/lib/api";
import type { DemoScenario, TriggerDemoResponse } from "@/lib/types";

const DIFFICULTY_COLORS = {
  easy: "bg-green-900/40 text-green-400 border-green-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  hard: "bg-red-900/40 text-red-400 border-red-800",
};

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [launched, setLaunched] = useState<TriggerDemoResponse | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScenarios()
      .then((r) => setScenarios(r.scenarios))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleTrigger(key: string) {
    setTriggering(key);
    setError(null);
    setLaunched(null);
    try {
      const res = await triggerDemo(key);
      setLaunched(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to trigger scenario");
    } finally {
      setTriggering(null);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetDemo();
      setLaunched(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">🎮 Demo Control Panel</h1>
        <p className="text-slate-400 text-sm">
          Trigger pre-built failure scenarios to watch the multi-agent pipeline in action.
          No GitHub account or API keys needed — all logs are pre-loaded fixtures.
        </p>
      </div>

      {error && (
        <div className="card border-red-800 bg-red-900/20 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {launched && (
        <div className="card border-green-800 bg-green-900/20 space-y-3 animate-slide-in">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <span className="text-lg">🚀</span> Pipeline launched!
          </div>
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Scenario:</span> {launched.display_name}
          </div>
          <div className="text-sm font-mono text-slate-400 bg-gray-950 px-3 py-1.5 rounded-lg">
            workflow_id: {launched.workflow_id}
          </div>
          <div className="text-xs text-slate-500">
            Estimated completion: ~{launched.estimated_seconds}s
          </div>
          <a
            href={`/workflows/${launched.workflow_id}`}
            className="btn-primary inline-block w-fit text-center"
          >
            Watch Live →
          </a>
        </div>
      )}

      {/* Scenarios grid */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">Loading scenarios…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scenarios.map((scenario) => (
            <div key={scenario.key} className="card hover:border-gray-700 transition-colors space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white text-sm">{scenario.display_name}</h3>
                <span
                  className={`badge border text-xs ${
                    DIFFICULTY_COLORS[scenario.difficulty]
                  }`}
                >
                  {scenario.difficulty}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {scenario.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  ~{scenario.estimated_seconds}s
                </span>
                <button
                  onClick={() => handleTrigger(scenario.key)}
                  disabled={!!triggering}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {triggering === scenario.key ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Launching…
                    </span>
                  ) : (
                    "▶ Run Scenario"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reset */}
      <div className="card border-gray-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">Reset Demo Data</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Deletes all demo workflow records for a clean slate.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="btn-ghost text-xs text-red-400 border-red-900 hover:bg-red-900/20"
        >
          {resetting ? "Resetting…" : "🗑 Reset"}
        </button>
      </div>
    </div>
  );
}