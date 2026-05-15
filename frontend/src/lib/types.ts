// ─── Matches backend agents/state.py ───────────────────────────────────────

export type WorkflowStatus = "pending" | "running" | "success" | "failed" | "partial";

export type FailureType =
  | "missing_env_var"
  | "dep_conflict"
  | "import_error"
  | "syntax_error"
  | "test_failure"
  | "docker_build_failure"
  | "ts_build_error"
  | "npm_dep_conflict"
  | "unknown";

export interface FailureClassification {
  failure_type: FailureType;
  language: "python" | "node" | "docker" | "generic";
  affected_files: string[];
  error_messages: string[];
  confidence: number;
  reasoning: string;
}

export interface PatchEntry {
  file: string;
  original: string;
  replacement: string;
  explanation: string;
}

export interface ProposedFix {
  strategy: string;
  patches: PatchEntry[];
  commands_to_run: string[];
  explanation: string;
}

export interface CommandResult {
  command: string;
  returncode: number;
  stdout: string;
  stderr: string;
}

export interface ValidationResult {
  passed: boolean;
  commands_run: CommandResult[];
  summary: string;
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
}

export interface IncidentReport {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  timeline: TimelineEvent[];
  root_cause_summary: string;
  evidence: string[];
  fix_applied: string;
  confidence: number;
  remediation_steps: string[];
  pr_description: string;
}

export interface AgentTraceEvent {
  agent: string;
  timestamp: string;
  event: "started" | "completed" | "failed" | "tool_call" | "message";
  message: string;
  data?: Record<string, unknown>;
}

// ─── API response types ─────────────────────────────────────────────────────

export interface WorkflowSummary {
  id: string;
  repo_name: string;
  branch: string;
  status: WorkflowStatus;
  current_agent: string | null;
  trigger_event: "webhook" | "demo";
  scenario_name: string | null;
  confidence_score: number | null;
  retry_count: number;
  pull_request_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WorkflowDetail extends WorkflowSummary {
  repo_url: string | null;
  commit_sha: string | null;
  raw_logs: string | null;
  parsed_failure: FailureClassification | null;
  proposed_fix: ProposedFix | null;
  validation_result: ValidationResult | null;
  incident_report: IncidentReport | null;
  agent_trace: AgentTraceEvent[] | null;
  github_comment_url: string | null;
}

export interface DemoScenario {
  key: string;
  display_name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  estimated_seconds: number;
}

export interface TriggerDemoResponse {
  workflow_id: string;
  scenario: string;
  display_name: string;
  estimated_seconds: number;
  status: string;
}