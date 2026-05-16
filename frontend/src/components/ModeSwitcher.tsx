"use client";

import { useState } from "react";
import { Zap, Github } from "lucide-react";
import RealRepoConnector from "@/components/RealRepoConnector";
import DemoScenarioGrid from "@/components/DemoScenarioGrid";

type Mode = "demo" | "real";

export default function ModeSwitcher() {
  const [mode, setMode] = useState<Mode>("demo");
  const [latestWorkflowId, setLatestWorkflowId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="inline-flex rounded-2xl bg-white/5 border border-white/10 p-1 gap-1">
        <button
          onClick={() => setMode("demo")}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
            uppercase tracking-wider transition-all
            ${
              mode === "demo"
                ? "bg-red-500/20 border border-red-500/30 text-red-300"
                : "text-zinc-500 hover:text-zinc-300"
            }
          `}
        >
          <Zap size={14} />
          Demo Mode
        </button>

        <button
          onClick={() => setMode("real")}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
            uppercase tracking-wider transition-all
            ${
              mode === "real"
                ? "bg-red-500/20 border border-red-500/30 text-red-300"
                : "text-zinc-500 hover:text-zinc-300"
            }
          `}
        >
          <Github size={14} />
          Real Repo
        </button>
      </div>

      {/* Tab description */}
      <p className="text-zinc-500 text-sm">
        {mode === "demo"
          ? "Run pre-built failure scenarios using fixture logs — no GitHub account needed."
          : "Connect your GitHub account to analyse and fix real CI/CD failures from your own repos."}
      </p>

      {/* Tab content */}
      {mode === "demo" ? (
        <DemoScenarioGrid />
      ) : (
        <RealRepoConnector
          onWorkflowStarted={(id) => setLatestWorkflowId(id)}
        />
      )}

      {/* Latest workflow shortcut (Real mode only) */}
      {mode === "real" && latestWorkflowId && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-zinc-300 text-sm">
            Pipeline running —{" "}
            <a
              href={`/workflows/${latestWorkflowId}`}
              className="text-green-400 hover:underline font-medium"
            >
              view live progress ↗
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
