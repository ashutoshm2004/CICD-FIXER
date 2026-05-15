import type { WorkflowSummary } from "@/lib/types";
import StatusBadge from "./StatusBadge";

const AGENT_ICONS: Record<string, string> = {
  intake: "📥",
  rca: "🔍",
  fix_generation: "🔧",
  validation: "✅",
  reflection: "🔄",
  incident_report: "📝",
};

export default function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  const duration =
    workflow.completed_at
      ? Math.round(
          (new Date(workflow.completed_at).getTime() -
            new Date(workflow.created_at).getTime()) /
            1000
        )
      : null;

  return (
    <a
      href={`/workflows/${workflow.id}`}
      className="card flex items-center gap-4 hover:border-gray-700 transition-all hover:bg-gray-900/80 group"
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <StatusBadge status={workflow.status} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm truncate">
            {workflow.repo_name}
          </span>
          <span className="text-xs text-slate-600 font-mono">
            {workflow.branch}
          </span>
          {workflow.scenario_name && (
            <span className="text-xs text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-900">
              {workflow.scenario_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
          <span>{new Date(workflow.created_at).toLocaleString()}</span>
          {duration != null && <span>⏱ {duration}s</span>}
          {workflow.retry_count > 0 && (
            <span>🔄 {workflow.retry_count} retr{workflow.retry_count === 1 ? "y" : "ies"}</span>
          )}
          {workflow.confidence_score != null && (
            <span className="text-brand-400">
              🎯 {Math.round(workflow.confidence_score * 100)}%
            </span>
          )}
          {workflow.current_agent && (
            <span>
              {AGENT_ICONS[workflow.current_agent] ?? "🤖"} {workflow.current_agent}
            </span>
          )}
        </div>
      </div>

      {/* Right: PR link + arrow */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {workflow.pull_request_url && (
          <span className="text-xs text-brand-400 bg-brand-900/20 px-2 py-1 rounded border border-brand-900">
            PR Created
          </span>
        )}
        <span className="text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
      </div>
    </a>
  );
}