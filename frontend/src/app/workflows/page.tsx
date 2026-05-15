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
    error = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Workflows</h1>
          <p className="text-slate-400 text-sm mt-1">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <a href="/demo" className="btn-primary text-sm">
          + New Demo Run
        </a>
      </div>

      {error && (
        <div className="card border-red-800 bg-red-900/20 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!error && workflows.length === 0 && (
        <div className="card text-center text-slate-500 py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">No workflows yet.</p>
          <a href="/demo" className="text-brand-400 hover:underline text-sm mt-2 inline-block">
            Run your first demo →
          </a>
        </div>
      )}

      <div className="grid gap-3">
        {workflows.map((wf) => (
          <WorkflowCard key={wf.id} workflow={wf} />
        ))}
      </div>
    </div>
  );
}