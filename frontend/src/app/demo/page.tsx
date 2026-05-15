"use client";

import { useEffect, useState } from "react";

import {
  Terminal,
  ShieldAlert,
  FlaskConical,
  Database,
  Cpu,
  Activity,
  Play,
  RefreshCcw,
  ArrowUpRight,
} from "lucide-react";

import {
  listScenarios,
  triggerDemo,
  resetDemo,
} from "@/lib/api";

import type {
  DemoScenario,
  TriggerDemoResponse,
} from "@/lib/types";

const CARD_STYLES: Record<
  string,
  {
    icon: any;
    glow: string;
    border: string;
    text: string;
    bg: string;
  }
> = {
  "missing-env": {
    icon: Terminal,
    glow: "shadow-[0_0_60px_rgba(255,120,80,0.15)]",
    border: "border-orange-500/20",
    text: "text-orange-300",
    bg: "bg-orange-500/5",
  },

  "broken-python-dependency": {
    icon: Cpu,
    glow: "shadow-[0_0_60px_rgba(255,80,120,0.15)]",
    border: "border-pink-500/20",
    text: "text-pink-300",
    bg: "bg-pink-500/5",
  },

  "docker-build-failure": {
    icon: Database,
    glow: "shadow-[0_0_60px_rgba(80,140,255,0.15)]",
    border: "border-blue-500/20",
    text: "text-blue-300",
    bg: "bg-blue-500/5",
  },

  "typescript-build-error": {
    icon: ShieldAlert,
    glow: "shadow-[0_0_60px_rgba(170,120,255,0.15)]",
    border: "border-violet-500/20",
    text: "text-violet-300",
    bg: "bg-violet-500/5",
  },

  "failing-tests": {
    icon: FlaskConical,
    glow: "shadow-[0_0_60px_rgba(255,70,70,0.15)]",
    border: "border-red-500/20",
    text: "text-red-300",
    bg: "bg-red-500/5",
  },
};

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<
    DemoScenario[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [triggering, setTriggering] =
    useState<string | null>(null);

  const [launched, setLaunched] =
    useState<TriggerDemoResponse | null>(null);

  const [error, setError] = useState<
    string | null
  >(null);

  const [resetting, setResetting] =
    useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await listScenarios();
        setScenarios(res.scenarios || []);
      } catch (err: any) {
        setError(
          err?.message || "Failed to load scenarios"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleTrigger(key: string) {
    try {
      setTriggering(key);
      setError(null);

      const res = await triggerDemo(key);

      setLaunched(res);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to launch scenario"
      );
    } finally {
      setTriggering(null);
    }
  }

  async function handleReset() {
    try {
      setResetting(true);

      await resetDemo();

      setLaunched(null);
    } catch (err: any) {
      setError(
        err?.message || "Reset failed"
      );
    } finally {
      setResetting(false);
    }
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
            <Activity
              className="text-red-400"
              size={28}
            />
          </div>

          <div>
            <div className="text-xs tracking-[0.35em] uppercase text-red-300 mb-3">
              Autonomous Recovery Sandbox
            </div>

            <h1 className="text-5xl font-semibold tracking-tight">
              Demo Control Center
            </h1>

            <p className="text-slate-500 mt-4 max-w-2xl leading-relaxed">
              Launch production-grade CI/CD failure
              simulations and watch ARGUS agents
              autonomously diagnose, patch,
              validate, and recover deployments.
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
          {error}
        </div>
      )}

      {/* LAUNCHED */}
      {launched && (
        <div
          className="
            mb-10 rounded-3xl
            border border-emerald-500/20
            bg-emerald-500/5
            p-6
            backdrop-blur-xl
          "
        >
          <div className="flex items-center justify-between flex-wrap gap-6">

            <div>
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <Play size={16} />
                Recovery Pipeline Started
              </div>

              <div className="mt-4 text-slate-400">
                {launched.display_name}
              </div>

              <div className="mt-2 text-xs font-mono text-slate-600">
                workflow_id: {launched.workflow_id}
              </div>
            </div>

            <a
              href={`/workflows/${launched.workflow_id}`}
              className="
                px-5 py-3 rounded-xl
                bg-white text-black
                hover:scale-[1.03]
                transition-all duration-300
                flex items-center gap-2
                text-sm font-medium
              "
            >
              Open Workflow
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="py-32 text-center text-slate-600">
          Loading recovery scenarios...
        </div>
      ) : (
        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6">

          {scenarios.map((scenario) => {
            const style =
              CARD_STYLES[scenario.key] ||
              CARD_STYLES["failing-tests"];

            const Icon = style.icon;

            return (
              <div
                key={scenario.key}
                className={`
                  relative overflow-hidden
                  rounded-3xl
                  border backdrop-blur-xl
                  p-7
                  transition-all duration-500
                  hover:-translate-y-2
                  ${style.border}
                  ${style.bg}
                  ${style.glow}
                `}
              >

                {/* glow */}
                <div
                  className="
                    absolute inset-0 opacity-40
                    bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_40%)]
                  "
                />

                {/* top */}
                <div className="relative flex items-start justify-between">

                  <div
                    className={`
                      w-14 h-14 rounded-2xl
                      border flex items-center justify-center
                      ${style.border}
                      ${style.bg}
                    `}
                  >
                    <Icon
                      className={style.text}
                      size={24}
                    />
                  </div>

                  <div className={`text-xs uppercase tracking-[0.25em] ${style.text}`}>
                    {scenario.difficulty}
                  </div>
                </div>

                {/* content */}
                <div className="relative mt-7">

                  <h3 className="text-2xl font-semibold">
                    {scenario.display_name}
                  </h3>

                  <p className="mt-4 text-slate-500 text-sm leading-relaxed min-h-[72px]">
                    {scenario.description}
                  </p>
                </div>

                {/* footer */}
                <div className="relative mt-8 flex items-center justify-between">

                  <div>
                    <div className="text-slate-600 text-xs uppercase tracking-[0.2em]">
                      Estimated Runtime
                    </div>

                    <div className="mt-2 text-white font-medium">
                      ~{scenario.estimated_seconds}s
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleTrigger(scenario.key)
                    }
                    disabled={!!triggering}
                    className={`
                      px-5 py-3 rounded-xl
                      transition-all duration-300
                      border text-sm font-medium
                      hover:scale-[1.03]
                      ${style.border}
                      ${style.bg}
                      ${style.text}
                    `}
                  >
                    {triggering === scenario.key
                      ? "Launching..."
                      : "Run Scenario"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESET */}
      <div
        className="
          mt-14 rounded-3xl
          border border-white/10
          bg-white/[0.03]
          backdrop-blur-xl
          p-8
        "
      >
        <div className="flex items-center justify-between flex-wrap gap-6">

          <div>
            <div className="text-xl font-semibold">
              Reset Environment
            </div>

            <p className="text-slate-500 mt-2 text-sm">
              Clear workflows and restore the
              sandbox environment to its initial
              state.
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="
              px-5 py-3 rounded-xl
              border border-white/10
              hover:border-red-500/20
              hover:bg-red-500/5
              transition-all duration-300
              flex items-center gap-2
            "
          >
            <RefreshCcw size={16} />

            {resetting
              ? "Resetting..."
              : "Reset Sandbox"}
          </button>
        </div>
      </div>
    </div>
  );
}