import type { WorkflowSummary } from "@/lib/types";

import {
  ArrowUpRight,
  Github,
  Sparkles,
  Clock3,
} from "lucide-react";

export default function WorkflowCard({
  workflow,
}: {
  workflow: WorkflowSummary;
}) {
  const duration =
    workflow.completed_at
      ? Math.round(
          (
            new Date(workflow.completed_at).getTime() -
            new Date(workflow.created_at).getTime()
          ) / 1000
        )
      : null;

  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-[34px]
        border border-white/[0.06]
        bg-black/40
        backdrop-blur-2xl
        p-7 lg:p-8
        transition-all duration-500
        hover:border-orange-500/20
        hover:bg-white/[0.03]
        hover:-translate-y-1
        hover:shadow-[0_0_80px_rgba(255,80,20,0.08)]
      "
    >
      {/* glow */}
      <div
        className="
          absolute inset-0 opacity-0
          group-hover:opacity-100
          transition-opacity duration-700
          bg-[radial-gradient(circle_at_top_left,rgba(255,90,31,0.12),transparent_35%)]
        "
      />

      {/* animated line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
        <div className="w-[30%] h-full bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-scan" />
      </div>

      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
        {/* LEFT */}
        <a
          href={`/workflows/${workflow.id}`}
          className="flex items-start gap-5 flex-1 min-w-0"
        >
          {/* icon */}
          <div
            className="
              w-16 h-16
              rounded-[24px]
              border border-orange-500/10
              bg-gradient-to-br
              from-orange-500/15
              to-red-500/10
              flex items-center justify-center
              shrink-0
              backdrop-blur-xl
            "
          >
            <Github
              size={30}
              className="text-orange-300"
            />
          </div>

          {/* content */}
          <div className="flex-1 min-w-0">
            {/* top row */}
            <div className="flex flex-wrap items-center gap-4">
              <h3
                className="
                  text-[30px]
                  font-black
                  text-white
                  tracking-[-0.03em]
                  truncate
                "
              >
                {workflow.repo_name}
              </h3>

              {/* recovered badge */}
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-emerald-400/20
                  bg-emerald-400/10
                  px-4 py-1.5
                  backdrop-blur-xl
                "
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                <span
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-emerald-300
                  "
                >
                  RECOVERED
                </span>
              </div>

              {/* scenario */}
              {workflow.scenario_name && (
                <div
                  className="
                    rounded-full
                    border border-orange-500/15
                    bg-orange-500/10
                    px-4 py-1.5
                    text-[11px]
                    uppercase
                    tracking-[0.22em]
                    text-orange-200
                    backdrop-blur-xl
                  "
                >
                  {workflow.scenario_name}
                </div>
              )}
            </div>

            {/* metadata */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-zinc-600" />

                <span className="font-mono uppercase tracking-[0.18em]">
                  {workflow.branch}
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-500">
                <Clock3 size={15} />

                <span>
                  {new Date(
                    workflow.created_at
                  ).toLocaleString()}
                </span>
              </div>

              {duration != null && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />

                  <span>
                    {duration}s runtime
                  </span>
                </div>
              )}

              {workflow.confidence_score != null && (
                <div className="flex items-center gap-2 text-orange-300">
                  <Sparkles size={15} />

                  <span className="font-semibold tracking-[0.08em]">
                    {Math.round(
                      workflow.confidence_score * 100
                    )}%
                  </span>
                </div>
              )}
            </div>

            {/* progress */}
            <div className="mt-8 h-[2px] bg-white/5 relative overflow-hidden rounded-full">
              <div
                className="
                  absolute inset-y-0 left-0
                  w-2/3
                  bg-gradient-to-r
                  from-orange-500
                  via-red-500
                  to-orange-300
                "
              />
            </div>
          </div>
        </a>

        {/* RIGHT */}
        <div className="flex items-center gap-4 shrink-0">
          {/* github button */}
          {workflow.pull_request_url && (
            <a
              href={workflow.pull_request_url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center gap-4
                rounded-2xl
                border border-white/[0.08]
                bg-white/[0.03]
                px-5 py-4
                transition-all duration-300
                hover:border-orange-500/20
                hover:bg-orange-500/10
              "
            >
              <div
                className="
                  w-12 h-12
                  rounded-xl
                  bg-black/40
                  border border-white/[0.08]
                  flex items-center justify-center
                "
              >
                <Github
                  size={22}
                  className="text-white"
                />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Pull Request
                </p>

                <h3 className="text-white font-semibold mt-1">
                  Autonomous Fix Commit
                </h3>
              </div>
            </a>
          )}

          {/* arrow */}
          <a
            href={`/workflows/${workflow.id}`}
            className="
              w-14 h-14
              rounded-2xl
              border border-white/[0.08]
              bg-white/[0.03]
              flex items-center justify-center
              transition-all duration-300
              hover:border-orange-500/20
              hover:bg-orange-500/10
            "
          >
            <ArrowUpRight
              size={22}
              className="text-zinc-500 hover:text-orange-300 transition-colors duration-300"
            />
          </a>
        </div>
      </div>
    </div>
  );
}