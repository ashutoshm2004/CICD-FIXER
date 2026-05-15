import {
  ArrowUpRight,
  Activity,
  Sparkles,
  Radar,
} from "lucide-react";

import { listWorkflows } from "@/lib/api";

import type { WorkflowSummary } from "@/lib/types";

import WorkflowCard from "@/components/WorkflowCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkflowsPage() {

  let workflows: WorkflowSummary[] = [];

  let error: string | null = null;

  try {
    workflows = await listWorkflows(50);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Failed to load";
  }

  return (

    <div className="space-y-10">

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
            bg-[radial-gradient(circle_at_top_left,rgba(255,90,31,0.12),transparent_30%)]
          "
        />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">

          {/* LEFT */}
          <div>

            <div
              className="
                inline-flex items-center gap-3
                rounded-full
                border border-orange-500/15
                bg-orange-500/10
                px-5 py-2
                backdrop-blur-xl
                mb-7
              "
            >

              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />

              <span
                className="
                  text-[11px]
                  uppercase
                  tracking-[0.3em]
                  text-orange-200
                  font-semibold
                "
              >
                Workflow Intelligence
              </span>
            </div>

            <h1
              className="
                text-[4rem]
                lg:text-[5rem]
                leading-[0.9]
                font-black
                tracking-[-0.06em]
                text-white
              "
            >
              Recovery
              <br />

              <span className="text-orange-300">
                Pipelines
              </span>
            </h1>

            <p
              className="
                mt-7
                max-w-2xl
                text-zinc-500
                text-lg
                leading-relaxed
              "
            >
              Observe autonomous recovery agents
              diagnosing failures, generating
              remediation patches, validating fixes,
              and restoring production systems in
              real-time.
            </p>

          </div>

          {/* RIGHT */}
          <div className="flex flex-col items-start xl:items-end gap-5">

            {/* modern button */}
            <a
              href="/demo"
              className="
                group
                relative
                overflow-hidden
                rounded-full
                border border-orange-500/20
                bg-white/[0.03]
                px-7 py-4
                text-sm font-semibold
                tracking-[0.18em]
                text-white
                transition-all duration-300
                hover:border-orange-500/40
                hover:text-black
                hover:shadow-[0_0_40px_rgba(255,120,40,0.35)]
              "
            >

              <span className="relative z-10 flex items-center gap-3">

                <span className="w-2 h-2 rounded-full bg-orange-400 group-hover:bg-black" />

                INITIATE RECOVERY

              </span>

              <div
                className="
                  absolute inset-0
                  translate-y-full
                  bg-gradient-to-r
                  from-orange-500
                  via-red-500
                  to-orange-400
                  transition-transform duration-300
                  group-hover:translate-y-0
                "
              />

            </a>

            {/* stats */}
            <div className="grid grid-cols-3 gap-4">

              {[
                {
                  label: "TOTAL",
                  value: workflows.length,
                  icon: Activity,
                },

                {
                  label: "ACTIVE",
                  value:
                    workflows.filter(
                      (w) =>
                        w.status === "running"
                    ).length,
                  icon: Radar,
                },

                {
                  label: "AI",
                  value: "92%",
                  icon: Sparkles,
                },
              ].map((item) => {

                const Icon = item.icon;

                return (

                  <div
                    key={item.label}
                    className="
                      rounded-2xl
                      border border-white/[0.06]
                      bg-white/[0.03]
                      px-5 py-4
                      min-w-[110px]
                    "
                  >

                    <div className="flex items-center justify-between">

                      <Icon
                        size={16}
                        className="text-orange-300"
                      />

                      <span
                        className="
                          text-[10px]
                          uppercase
                          tracking-[0.2em]
                          text-zinc-600
                        "
                      >
                        {item.label}
                      </span>
                    </div>

                    <h3
                      className="
                        mt-5
                        text-3xl
                        font-black
                        text-white
                      "
                    >
                      {item.value}
                    </h3>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (

        <div
          className="
            rounded-3xl
            border border-red-500/20
            bg-red-500/10
            p-6
            text-red-300
            backdrop-blur-xl
          "
        >

          <div className="flex items-center gap-3">

            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />

            <span className="font-medium">
              {error}
            </span>

          </div>

        </div>
      )}

      {/* ================================================= */}
      {/* EMPTY */}
      {/* ================================================= */}

      {!error && workflows.length === 0 && (

        <div
          className="
            rounded-[36px]
            border border-white/[0.06]
            bg-black/30
            backdrop-blur-2xl
            p-16
            text-center
          "
        >

          <div
            className="
              w-24 h-24
              rounded-full
              border border-orange-500/15
              bg-orange-500/10
              flex items-center justify-center
              mx-auto
            "
          >

            <Radar
              size={38}
              className="text-orange-300"
            />

          </div>

          <h3
            className="
              mt-8
              text-3xl
              font-black
              text-white
            "
          >
            No Recovery Pipelines
          </h3>

          <p
            className="
              mt-4
              text-zinc-500
              max-w-lg
              mx-auto
              leading-relaxed
            "
          >
            Trigger a failure simulation and
            observe how autonomous agents recover
            your infrastructure.
          </p>

          <a
            href="/demo"
            className="
              inline-flex items-center gap-3
              mt-10
              rounded-full
              border border-orange-500/20
              bg-orange-500/10
              px-6 py-4
              text-sm
              uppercase
              tracking-[0.18em]
              text-orange-200
              transition-all duration-300
              hover:bg-orange-500/20
            "
          >

            Launch Simulation

            <ArrowUpRight size={16} />

          </a>

        </div>
      )}

      {/* ================================================= */}
      {/* LIST */}
      {/* ================================================= */}

      {workflows.length > 0 && (

        <section className="space-y-5">

          <div className="flex items-center justify-between">

            <div>

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-[0.3em]
                  text-zinc-600
                "
              >
                Active Monitoring
              </p>

              <h2
                className="
                  mt-2
                  text-4xl
                  font-black
                  tracking-[-0.05em]
                  text-white
                "
              >
                Incident Streams
              </h2>

            </div>

            <div
              className="
                hidden md:flex
                items-center gap-3
                rounded-full
                border border-emerald-400/15
                bg-emerald-400/10
                px-5 py-2
              "
            >

              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              <span
                className="
                  text-[11px]
                  uppercase
                  tracking-[0.22em]
                  text-emerald-300
                  font-semibold
                "
              >
                LIVE PIPELINES
              </span>

            </div>
          </div>

          <div className="space-y-5">

            {workflows.map((wf) => (

              <WorkflowCard
                key={wf.id}
                workflow={wf}
              />

            ))}
          </div>
        </section>
      )}
    </div>
  );
}