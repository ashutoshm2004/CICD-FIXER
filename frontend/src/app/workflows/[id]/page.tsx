import { getWorkflow } from "@/lib/api";
import AgentTimeline from "@/components/AgentTimeline";
import DiffViewer from "@/components/DiffViewer";
import IncidentReport from "@/components/IncidentReport";
import LogViewer from "@/components/LogViewer";
import StatusBadge from "@/components/StatusBadge";
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">
              {workflow.repo_name}
            </h1>
            <StatusBadge status={workflow.status} />
            {workflow.scenario_name && (
              <span className="badge bg-purple-900/40 text-purple-400 border border-purple-800">
                {workflow.scenario_name}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            {workflow.id}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Branch: <span className="text-slate-300">{workflow.branch}</span></span>
            <span>Trigger: <span className="text-slate-300">{workflow.trigger_event}</span></span>
            <span>Retries: <span className="text-slate-300">{workflow.retry_count}</span></span>
            {workflow.confidence_score != null && (
              <span>
                Confidence:{" "}
                <span className="text-brand-400 font-medium">
                  {Math.round(workflow.confidence_score * 100)}%
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {workflow.pull_request_url && (
            <a
              href={workflow.pull_request_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm"
            >
              🔀 View PR
            </a>
          )}
          <a href="/workflows" className="btn-ghost text-sm">
            ← Back
          </a>
        </div>
      </div>

      {/* Root Cause */}
      {failure && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            🔍 Root Cause Analysis
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className="badge bg-orange-900/40 text-orange-400 border border-orange-800">
              {failure.failure_type.replace(/_/g, " ")}
            </span>
            <span className="badge bg-blue-900/40 text-blue-400 border border-blue-800">
              {failure.language}
            </span>
            <span className="badge bg-gray-800 text-slate-300 border border-gray-700">
              {Math.round(failure.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-sm text-slate-300">{failure.reasoning}</p>
          {failure.error_messages.length > 0 && (
            <div className="bg-gray-950 rounded-lg p-3 space-y-1">
              {failure.error_messages.slice(0, 3).map((msg, i) => (
                <p key={i} className="mono text-red-400 text-xs">
                  {msg}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two-column: fix + validation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Proposed Fix */}
        {fix && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              🔧 Proposed Fix
            </h2>
            <p className="text-sm text-slate-300">{fix.strategy}</p>
            <DiffViewer patches={fix.patches} />
          </div>
        )}

        {/* Validation */}
        {validation && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              ✅ Validation
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`badge border ${
                  validation.passed
                    ? "bg-green-900/40 text-green-400 border-green-800"
                    : "bg-red-900/40 text-red-400 border-red-800"
                }`}
              >
                {validation.passed ? "PASSED" : "FAILED"}
              </span>
            </div>
            <p className="text-sm text-slate-400">{validation.summary}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {validation.commands_run.map((cmd, i) => (
                <div key={i} className="bg-gray-950 rounded p-2">
                  <p className="mono text-xs text-slate-500">$ {cmd.command}</p>
                  <p
                    className={`mono text-xs mt-0.5 ${
                      cmd.returncode === 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    exit {cmd.returncode}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Agent Timeline */}
      {workflow.agent_trace && workflow.agent_trace.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            ⏱ Agent Timeline
          </h2>
          <AgentTimeline events={workflow.agent_trace} />
        </div>
      )}

      {/* Raw Logs */}
      {workflow.raw_logs && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            📋 Raw CI/CD Logs
          </h2>
          <LogViewer logs={workflow.raw_logs} />
        </div>
      )}

      {/* Incident Report */}
      {report && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            📝 Incident Report
          </h2>
          <IncidentReport report={report} />
        </div>
      )}
    </div>
  );
}