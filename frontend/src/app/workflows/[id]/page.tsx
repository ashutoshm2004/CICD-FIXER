import { getWorkflow } from "@/lib/api";

import AgentTimeline from "@/components/AgentTimeline";
import DiffViewer from "@/components/DiffViewer";
import IncidentReport from "@/components/IncidentReport";
import LogViewer from "@/components/LogViewer";
import StatusBadge from "@/components/StatusBadge";

import {
  ArrowLeft,
  Github,
  Sparkles,
  ShieldCheck,
  Radar,
  Terminal,
} from "lucide-react";

import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let workflow;

  try {
    workflow = await getWorkflow(params.id);
  } catch {
    notFound();
  }

  const failure = workflow.parsed_failure;
  const fix = workflow.proposed_fix;
  const validation = workflow.validation_result;
  const report = workflow.incident_report;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section
        className="
          relative overflow-hidden
          rounded-[36px]
          border border-white/[0.06]
          bg-black/40
          backdrop-blur-2xl
          p-8 lg:p-10
        "
      >

        {/* glow */}
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle_at_top_left,rgba(255,80,20,0.12),transparent_35%)]
          "
        />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start justify-between gap-10">

          {/* LEFT */}
          <div className="flex items-start gap-6 flex-1">

            {/* icon */}
            <div
              className="
                w-20 h-20
                rounded-[28px]
                border border-orange-500/15
                bg-orange-500/10
                flex items-center justify-center
                shrink-0
              "
            >

              <Radar
                size={38}
                className="text-orange-300"
              />

            </div>

            <div className="min-w-0 flex-1">

              {/* top chips */}
              <div className="flex flex-wrap items-center gap-4 mb-6">

                <div
                  className="
                    inline-flex items-center gap-2
                    rounded-full
                    border border-emerald-400/20
                    bg-emerald-400/10
                    px-4 py-2
                  "
                >

                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                  <span
                    className="
                      text-[11px]
                      uppercase
                      tracking-[0.2em]
                      text-emerald-300
                      font-semibold
                    "
                  >
                    RECOVERED
                  </span>
                </div>

                {workflow.scenario_name && (
                  <div
                    className="
                      rounded-full
                      border border-orange-500/15
                      bg-orange-500/10
                      px-4 py-2
                      text-[11px]
                      uppercase
                      tracking-[0.22em]
                      text-orange-200
                    "
                  >
                    {workflow.scenario_name}
                  </div>
                )}

              </div>

              {/* title */}
              <h1
                className="
                  text-[3rem]
                  lg:text-[4rem]
                  leading-[0.92]
                  font-black
                  tracking-[-0.06em]
                  text-white
                  break-words
                "
              >
                {workflow.repo_name}
              </h1>

              {/* workflow id */}
              <p
                className="
                  mt-5
                  text-sm
                  text-zinc-600
                  font-mono
                  break-all
                "
              >
                {workflow.id}
              </p>

              {/* metadata */}
              <div className="mt-7 flex flex-wrap gap-5">

                <div
                  className="
                    rounded-2xl
                    border border-white/[0.06]
                    bg-white/[0.03]
                    px-5 py-4
                  "
                >

                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Branch
                  </p>

                  <p className="mt-2 text-white font-semibold">
                    {workflow.branch}
                  </p>

                </div>

                <div
                  className="
                    rounded-2xl
                    border border-white/[0.06]
                    bg-white/[0.03]
                    px-5 py-4
                  "
                >

                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Trigger
                  </p>

                  <p className="mt-2 text-white font-semibold">
                    {workflow.trigger_event}
                  </p>

                </div>

                <div
                  className="
                    rounded-2xl
                    border border-white/[0.06]
                    bg-white/[0.03]
                    px-5 py-4
                  "
                >

                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Confidence
                  </p>

                  <p className="mt-2 text-orange-300 font-black text-xl">
                    {workflow.confidence_score != null
                      ? `${Math.round(
                          workflow.confidence_score * 100
                        )}%`
                      : "--"}
                  </p>

                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4">

            {/* PR */}
            {workflow.pull_request_url && (

              <a
                href={workflow.pull_request_url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group
                  relative overflow-hidden
                  rounded-3xl
                  border border-white/[0.08]
                  bg-white/[0.03]
                  p-6
                  transition-all duration-300
                  hover:border-orange-400/30
                  hover:bg-orange-500/10
                  hover:shadow-[0_0_40px_rgba(255,120,40,0.18)]
                "
              >

                <div className="flex items-center gap-5">

                  <div
                    className="
                      w-14 h-14
                      rounded-2xl
                      border border-white/[0.08]
                      bg-black/40
                      flex items-center justify-center
                    "
                  >

                    <Github
                      size={26}
                      className="text-white"
                    />

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                      Pull Request
                    </p>

                    <h3 className="mt-2 text-white font-semibold">
                      Autonomous Fix Commit
                    </h3>

                  </div>
                </div>
              </a>
            )}

            {/* back */}
            <a
              href="/workflows"
              className="
                rounded-2xl
                border border-white/[0.06]
                bg-white/[0.03]
                px-5 py-4
                flex items-center gap-3
                text-zinc-400
                transition-all duration-300
                hover:border-orange-500/20
                hover:bg-orange-500/5
                hover:text-white
              "
            >

              <ArrowLeft size={18} />

              Back to Pipelines

            </a>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* RCA */}
      {/* ================================================= */}

      {failure && (

        <section
          className="
            rounded-[34px]
            border border-white/[0.06]
            bg-black/30
            backdrop-blur-2xl
            p-8
          "
        >

          <div className="flex items-center gap-3 mb-8">

            <div
              className="
                w-12 h-12
                rounded-2xl
                border border-orange-500/15
                bg-orange-500/10
                flex items-center justify-center
              "
            >

              <Terminal
                size={22}
                className="text-orange-300"
              />

            </div>

            <div>

              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                Diagnostics
              </p>

              <h2 className="mt-1 text-2xl font-black text-white">
                Root Cause Analysis
              </h2>

            </div>
          </div>

          {/* chips */}
          <div className="flex flex-wrap gap-3">

            <div
              className="
                rounded-full
                border border-orange-500/15
                bg-orange-500/10
                px-5 py-2
                text-xs uppercase tracking-[0.2em]
                text-orange-200
              "
            >
              {failure.failure_type.replace(/_/g, " ")}
            </div>

            <div
              className="
                rounded-full
                border border-blue-500/15
                bg-blue-500/10
                px-5 py-2
                text-xs uppercase tracking-[0.2em]
                text-blue-200
              "
            >
              {failure.language}
            </div>

            <div
              className="
                rounded-full
                border border-white/[0.08]
                bg-white/[0.03]
                px-5 py-2
                text-xs uppercase tracking-[0.2em]
                text-zinc-400
              "
            >
              {Math.round(failure.confidence * 100)}% confidence
            </div>
          </div>

          {/* reasoning */}
          <p className="mt-8 text-zinc-400 leading-relaxed text-lg">
            {failure.reasoning}
          </p>

          {/* logs */}
          {failure.error_messages.length > 0 && (

            <div
              className="
                mt-8
                rounded-3xl
                border border-red-500/10
                bg-black/50
                p-5
                space-y-3
              "
            >

              {failure.error_messages
                .slice(0, 3)
                .map((msg, i) => (

                  <div
                    key={i}
                    className="
                      rounded-2xl
                      border border-white/[0.05]
                      bg-white/[0.02]
                      px-4 py-3
                      font-mono text-sm
                      text-red-300
                      overflow-x-auto
                    "
                  >
                    {msg}
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* ================================================= */}
      {/* FIX + VALIDATION */}
      {/* ================================================= */}

      <section className="grid xl:grid-cols-2 gap-6">

        {/* FIX */}
        {fix && (

          <div
            className="
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              p-8
            "
          >

            <div className="flex items-center gap-3 mb-7">

              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  border border-orange-500/15
                  bg-orange-500/10
                  flex items-center justify-center
                "
              >

                <Sparkles
                  size={22}
                  className="text-orange-300"
                />

              </div>

              <div>

                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                  Autonomous Patch
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Proposed Fix
                </h2>

              </div>
            </div>

            <p className="text-zinc-400 leading-relaxed mb-8">
              {fix.strategy}
            </p>

            <DiffViewer patches={fix.patches} />

          </div>
        )}

        {/* VALIDATION */}
        {validation && (

          <div
            className="
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              p-8
            "
          >

            <div className="flex items-center gap-3 mb-7">

              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  border border-cyan-500/15
                  bg-cyan-500/10
                  flex items-center justify-center
                "
              >

                <ShieldCheck
                  size={22}
                  className="text-cyan-300"
                />

              </div>

              <div>

                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                  Verification
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Recovery Validation
                </h2>

              </div>
            </div>

            {/* status */}
            <div
              className={`
                inline-flex items-center gap-3
                rounded-full
                px-5 py-3
                border
                ${
                  validation.passed
                    ? "border-cyan-400/20 bg-cyan-400/10"
                    : "border-red-400/20 bg-red-400/10"
                }
              `}
            >

              <div
                className={`
                  w-2 h-2 rounded-full animate-pulse
                  ${
                    validation.passed
                      ? "bg-cyan-400"
                      : "bg-red-400"
                  }
                `}
              />

              <span
                className={`
                  text-xs uppercase tracking-[0.22em] font-semibold
                  ${
                    validation.passed
                      ? "text-cyan-300"
                      : "text-red-300"
                  }
                `}
              >
                {validation.passed
                  ? "VERIFIED"
                  : "FAILED"}
              </span>

            </div>

            <p className="mt-7 text-zinc-400 leading-relaxed">
              {validation.summary}
            </p>

            {/* commands */}
            <div className="mt-8 space-y-3 max-h-[320px] overflow-y-auto">

              {validation.commands_run.map((cmd, i) => (

                <div
                  key={i}
                  className="
                    rounded-2xl
                    border border-white/[0.06]
                    bg-white/[0.03]
                    p-4
                  "
                >

                  <p className="font-mono text-sm text-zinc-500">
                    $ {cmd.command}
                  </p>

                  <div className="mt-3 flex items-center gap-2">

                    <div
                      className={`
                        w-2 h-2 rounded-full
                        ${
                          cmd.returncode === 0
                            ? "bg-emerald-400"
                            : "bg-red-400"
                        }
                      `}
                    />

                    <span
                      className={`
                        text-xs uppercase tracking-[0.2em]
                        ${
                          cmd.returncode === 0
                            ? "text-emerald-300"
                            : "text-red-300"
                        }
                      `}
                    >
                      exit {cmd.returncode}
                    </span>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* TIMELINE */}
      {/* ================================================= */}

      {workflow.agent_trace &&
        workflow.agent_trace.length > 0 && (

          <section
            className="
              rounded-[34px]
              border border-white/[0.06]
              bg-black/30
              backdrop-blur-2xl
              p-8
            "
          >

            <h2 className="text-3xl font-black text-white mb-8">
              Autonomous Timeline
            </h2>

            <AgentTimeline
              events={workflow.agent_trace}
            />

          </section>
        )}

      {/* ================================================= */}
      {/* LOGS */}
      {/* ================================================= */}

      {workflow.raw_logs && (

        <section
          className="
            rounded-[34px]
            border border-white/[0.06]
            bg-black/30
            backdrop-blur-2xl
            p-8
          "
        >

          <h2 className="text-3xl font-black text-white mb-8">
            CI/CD Logs
          </h2>

          <LogViewer logs={workflow.raw_logs} />

        </section>
      )}

      {/* ================================================= */}
      {/* REPORT */}
      {/* ================================================= */}

      {report && (

        <section
          className="
            rounded-[34px]
            border border-white/[0.06]
            bg-black/30
            backdrop-blur-2xl
            p-8
          "
        >

          <h2 className="text-3xl font-black text-white mb-8">
            Incident Report
          </h2>

          <IncidentReport report={report} />

        </section>
      )}
    </div>
  );
}