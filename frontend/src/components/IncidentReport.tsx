import type { IncidentReport as IncidentReportType } from "@/lib/types";

const SEVERITY_COLORS = {
  low: "bg-blue-900/40 text-blue-400 border-blue-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  high: "bg-orange-900/40 text-orange-400 border-orange-800",
  critical: "bg-red-900/40 text-red-400 border-red-800",
};

export default function IncidentReport({ report }: { report: IncidentReportType }) {
  return (
    <div className="space-y-5">
      {/* Title + severity */}
      <div className="flex items-start gap-3 flex-wrap">
        <h3 className="font-semibold text-white text-base flex-1">{report.title}</h3>
        <span className={`badge border ${SEVERITY_COLORS[report.severity] ?? SEVERITY_COLORS.medium}`}>
          {report.severity.toUpperCase()}
        </span>
        <span className="badge bg-gray-800 text-slate-300 border border-gray-700">
          {Math.round(report.confidence * 100)}% confidence
        </span>
      </div>

      {/* Root cause */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Root Cause
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          {report.root_cause_summary}
        </p>
      </div>

      {/* Fix applied */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Fix Applied
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">{report.fix_applied}</p>
      </div>

      {/* Evidence */}
      {report.evidence && report.evidence.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Evidence
          </h4>
          <ul className="space-y-1">
            {report.evidence.map((e, i) => (
              <li key={i} className="text-xs text-slate-400 font-mono bg-gray-950 px-2 py-1 rounded">
                • {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Remediation steps */}
      {report.remediation_steps && report.remediation_steps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Remediation Steps
          </h4>
          <ol className="space-y-1.5">
            {report.remediation_steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-brand-400 font-bold flex-shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Timeline */}
      {report.timeline && report.timeline.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Timeline
          </h4>
          <div className="space-y-1">
            {report.timeline.map((t, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <span className="text-slate-600 font-mono flex-shrink-0">
                  {t.timestamp}
                </span>
                <span className="text-slate-400">{t.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PR description */}
      {report.pr_description && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            PR Description
          </h4>
          <pre className="text-xs text-slate-400 bg-gray-950 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
            {report.pr_description}
          </pre>
        </div>
      )}
    </div>
  );
}