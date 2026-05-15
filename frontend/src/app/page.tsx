import {
  Activity,
  ArrowUpRight,
  Cpu,
  Radar,
  ShieldAlert,
  Sparkles,
  Github,
  Zap,
} from "lucide-react";

import { listWorkflows } from "@/lib/api";
import WorkflowCard from "@/components/WorkflowCard";
import ModeSwitcher from "@/components/ModeSwitcher";
import type { WorkflowSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats(workflows: WorkflowSummary[]) {

  const total = workflows.length;
  const success = workflows.filter((w) => w.status === "success").length;
  const failed = workflows.filter((w) => w.status === "failed").length;
  const avgConfidence =
    workflows
      .filter((w) => w.confidence_score != null)
      .reduce((sum, w) => sum + (w.confidence_score ?? 0), 0) /
    (workflows.filter((w) => w.confidence_score != null).length || 1);

  return { total, success, failed, avgConfidence };
}

export default async function DashboardPage() {

  let workflows: WorkflowSummary[] = [];
  try {
    workflows = await listWorkflows(20);
  } catch {}

  const stats = await getStats(workflows);

  return (
    <div className="space-y-10">

      {/* ================================================= */}
      {/* HERO                                              */}
      {/* ================================================= */}

      <section className="hero-panel rounded-[34px] p-6 lg:p-8">
        <div className="grid xl:grid-cols-[1fr_0.7fr_240px] gap-6 items-center">

          {/* LEFT */}
          <div>
            <div className="inline-flex items-center gap-3 border border-red-500/20 bg-red-500/10 px-5 py-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.3em] text-red-300">
                Autonomous Recovery Engine
              </span>
            </div>

            <h1 className="display-title text-[4rem] lg:text-[5.5rem] xl:text-[6rem]">
              <span className="text-white">AI</span>
              <br />
              <span className="text-red-500">COMMAND</span>
              <br />
              <span className="text-white">CENTER</span>
            </h1>

            <p className="mt-8 text-zinc-400 text-lg max-w-2xl leading-relaxed">
              Autonomous AI agents detect deployment failures, perform
              root-cause analysis, generate remediation patches, validate
              recovery pipelines, and deploy intelligent fixes across your
              infrastructure in real-time.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">
              <a href="/demo" className="btn-primary px-8 py-4 flex items-center gap-2">
                <Zap size={16} />
                Launch Demo
              </a>
              <a href="/workflows" className="btn-secondary px-8 py-4">
                View Telemetry
              </a>
            </div>
          </div>

          {/* CENTER RADAR */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-[320px] h-[320px] xl:w-[360px] xl:h-[360px] animate-spin-slow">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="absolute inset-0 flex items-center justify-center">
                  <div
                    style={{ width: `${220 + i * 70}px`, height: `${220 + i * 70}px` }}
                    className="rounded-full border border-red-500/15"
                  />
                </div>
              ))}

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[160px] h-[160px] rounded-full bg-red-500/10 radar-pulse absolute" />
                <div className="w-[140px] h-[140px] rounded-full border border-red-500/30 bg-red-500/10 backdrop-blur-xl flex items-center justify-center">
                  <Radar size={68} className="text-red-500" />
                </div>
              </div>

              {["top-[18%] left-[70%]", "top-[72%] left-[22%]", "top-[44%] left-[84%]", "top-[80%] left-[62%]"].map(
                (cls, i) => (
                  <div key={i} className={`absolute ${cls}`}>
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>
                )
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="panel rounded-[28px] p-5 space-y-5 max-w-[240px] w-full">
            {[
              ["ACTIVE AGENTS", stats.total],
              ["RECOVERIES TODAY", stats.success],
              ["SUCCESS RATE", `${Math.round(stats.avgConfidence * 100)}%`],
              ["SYSTEM HEALTH", "OPTIMAL"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-white/[0.05] pb-5 last:border-0">
                <p className="muted-label mb-4">{label}</p>
                <h3 className="text-3xl xl:text-4xl font-black text-red-500 whitespace-nowrap">
                  {value}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* MODE SWITCHER — Demo vs Real Repo                 */}
      {/* ================================================= */}

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Github size={16} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Trigger Analysis</h2>
        </div>

        {/* ModeSwitcher is a client component that handles the tab UI
            and conditionally renders DemoScenarios or RealRepoConnector */}
        <ModeSwitcher />
      </section>

      {/* ================================================= */}
      {/* METRICS                                           */}
      {/* ================================================= */}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { label: "ACTIVE WORKFLOWS", value: stats.total, icon: Activity, change: "+12%" },
          { label: "RECOVERED", value: stats.success, icon: ShieldAlert, change: "+8%" },
          { label: "FAILED", value: stats.failed, icon: Cpu, change: "-4%" },
          { label: "AI CONFIDENCE", value: `${Math.round(stats.avgConfidence * 100)}%`, icon: Sparkles, change: "+5%" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="metric-card rounded-[28px] p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="muted-label mb-5">{item.label}</p>
                  <h3 className="text-5xl font-black text-white">{item.value}</h3>
                  <p className="text-red-500 text-sm mt-5">{item.change} vs yesterday</p>
                </div>
                <div className="w-16 h-16 border border-red-500/20 bg-red-500/10 flex items-center justify-center">
                  <Icon size={28} className="text-red-500" />
                </div>
              </div>
              <div className="mt-10 h-[2px] bg-white/5 relative overflow-hidden">
                <div className="absolute left-0 inset-y-0 w-2/3 bg-gradient-to-r from-red-500 via-orange-400 to-transparent animate-pulse" />
              </div>
            </div>
          );
        })}
      </section>

      {/* ================================================= */}
      {/* PIPELINE + TELEMETRY                              */}
      {/* ================================================= */}

      <section className="grid xl:grid-cols-[1fr_380px] gap-6">

        {/* Pipeline */}
        <div className="panel rounded-[32px] p-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-bold text-white">AI Recovery Pipeline</h2>
            <div className="text-red-500 text-sm uppercase tracking-[0.2em]">Live Feed</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            {["INTAKE", "RCA", "PATCH", "VALIDATE", "REFLECT", "RECOVER"].map((step) => (
              <div key={step} className="pipeline-node rounded-[24px] p-6 text-center">
                <div className="w-16 h-16 rounded-full border border-red-500/20 bg-red-500/10 mx-auto flex items-center justify-center mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <h3 className="text-white font-bold tracking-[0.12em]">{step}</h3>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] mt-2">AI ACTIVE</p>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry */}
        <div className="panel rounded-[32px] p-7">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">System Telemetry</h2>
            <div className="text-red-500 text-xs uppercase tracking-[0.2em]">● LIVE</div>
          </div>
          <div className="space-y-7">
            {[
              ["CPU UTILIZATION", "34%"],
              ["MEMORY", "62%"],
              ["NETWORK I/O", "21%"],
              ["DISK ACTIVITY", "48%"],
              ["AI AGENT LOAD", "73%"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-zinc-400 text-sm">{label}</p>
                  <p className="text-white font-semibold">{value}</p>
                </div>
                <div className="h-[2px] bg-white/5 relative overflow-hidden">
                  <div
                    className="absolute left-0 inset-y-0 bg-gradient-to-r from-red-500 to-transparent"
                    style={{ width: value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* INCIDENTS                                         */}
      {/* ================================================= */}

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-black">Active Incidents</h2>
          <a
            href="/workflows"
            className="text-red-500 uppercase tracking-[0.18em] text-sm flex items-center gap-2"
          >
            View All
            <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="space-y-5">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      </section>
    </div>
  );
}
