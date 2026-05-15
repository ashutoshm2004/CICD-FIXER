import { listWorkflows } from "@/lib/api";
import WorkflowCard from "@/components/WorkflowCard";
import StatusBadge from "@/components/StatusBadge";
import type { WorkflowSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats(workflows: WorkflowSummary[]) {
  const total = workflows.length;
  const success = workflows.filter((w) => w.status === "success").length;
  const failed = workflows.filter((w) => w.status === "failed").length;
  const running = workflows.filter((w) => w.status === "running").length;
  const avgConfidence =
    workflows
      .filter((w) => w.confidence_score != null)
      .reduce((sum, w) => sum + (w.confidence_score ?? 0), 0) /
      (workflows.filter((w) => w.confidence_score != null).length || 1);
  return { total, success, failed, running, avgConfidence };
}

export default async function DashboardPage() {
  let workflows: WorkflowSummary[] = [];
  let error: string | null = null;

  try {
    workflows = await listWorkflows(20);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load workflows";
  }

  const stats = await getStats(workflows);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8 space-y-3">
        <div className="text-5xl mb-2">🤖</div>
        <h1 className="text-3xl font-bold text-white">
          Autonomous CI/CD Failure Fixer
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          A real multi-agent AI pipeline that diagnoses failed deployments, generates fixes,
          validates them, and creates pull requests — fully autonomously.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <a href="/demo" className="btn-primary">
            🎮 Run a Demo Scenario
          </a>
          <a href="/workflows" className="btn-ghost">
            View All Workflows →
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: stats.total, icon: "📋" },
          { label: "Fixed", value: stats.success, icon: "✅", color: "text-green-400" },
          { label: "Failed", value: stats.failed, icon: "❌", color: "text-red-400" },
          {
            label: "Avg Confidence",
            value: `${Math.round(stats.avgConfidence * 100)}%`,
            icon: "🎯",
            color: "text-brand-400",
          },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color ?? "text-white"}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent pipeline diagram */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Multi-Agent Pipeline
        </h2>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { name: "Intake", icon: "📥", desc: "Fetch & parse logs" },
            { name: "RCA", icon: "🔍", desc: "Root cause analysis" },
            { name: "Fix Gen", icon: "🔧", desc: "Generate patches" },
            { name: "Validate", icon: "✅", desc: "Run tests/builds" },
            { name: "Reflect", icon: "🔄", desc: "Retry on failure" },
            { name: "Incident", icon: "📝", desc: "Report + PR" },
          ].map((agent, i) => (
            <div key={agent.name} className="flex items-center gap-1">
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-center min-w-[90px]">
                <div className="text-lg">{agent.icon}</div>
                <div className="text-xs font-semibold text-white">{agent.name}</div>
                <div className="text-[10px] text-slate-500">{agent.desc}</div>
              </div>
              {i < 5 && (
                <span className="text-gray-600 font-bold text-lg">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent workflows */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Workflows</h2>
          {stats.running > 0 && (
            <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              {stats.running} running
            </span>
          )}
        </div>

        {error && (
          <div className="card border-red-800 bg-red-900/20 text-red-400 text-sm">
            ⚠️ {error} — Is the backend running? Try{" "}
            <code className="mono">docker compose up</code>
          </div>
        )}

        {!error && workflows.length === 0 && (
          <div className="card text-center text-slate-500 py-12">
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-sm">No workflows yet.</p>
            <p className="text-xs mt-1">
              <a href="/demo" className="text-brand-400 hover:underline">
                Run a demo scenario
              </a>{" "}
              to see the agents in action.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      </div>
    </div>
  );
}