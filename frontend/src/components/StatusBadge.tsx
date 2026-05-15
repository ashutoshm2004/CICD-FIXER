import type { WorkflowStatus } from "@/lib/types";

const CONFIG: Record<WorkflowStatus, { label: string; classes: string; dot?: string }> = {
  pending:  { label: "Pending",  classes: "bg-gray-800 text-slate-400 border-gray-700", dot: "bg-slate-400" },
  running:  { label: "Running",  classes: "bg-blue-900/40 text-blue-400 border-blue-800", dot: "bg-blue-400 animate-pulse-fast" },
  success:  { label: "Fixed ✓",  classes: "bg-green-900/40 text-green-400 border-green-800" },
  failed:   { label: "Failed",   classes: "bg-red-900/40 text-red-400 border-red-800" },
  partial:  { label: "Partial",  classes: "bg-yellow-900/40 text-yellow-400 border-yellow-800" },
};

export default function StatusBadge({ status }: { status: WorkflowStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`badge border ${cfg.classes}`}>
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}