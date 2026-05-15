from typing import TypedDict, Optional, List, Dict, Any


class FailureClassification(TypedDict):
    failure_type: str       # env_missing | dep_conflict | docker_build | ts_error | test_failure | import_error | syntax_error | unknown
    language: str           # python | node | docker | generic
    affected_files: List[str]
    error_messages: List[str]
    confidence: float       # 0.0 - 1.0
    reasoning: str


class ProposedFix(TypedDict):
    strategy: str           # human-readable strategy description
    patches: List[Dict]     # list of {file, original, replacement, explanation}
    commands_to_run: List[str]
    explanation: str


class ValidationResult(TypedDict):
    passed: bool
    commands_run: List[Dict]  # {command, returncode, stdout, stderr}
    summary: str


class IncidentReport(TypedDict):
    title: str
    severity: str           # low | medium | high | critical
    timeline: List[Dict]    # {timestamp, event}
    root_cause_summary: str
    evidence: List[str]
    fix_applied: str
    confidence: float
    remediation_steps: List[str]
    pr_description: str


class WorkflowState(TypedDict):
    # Identifiers
    workflow_id: str
    repo_name: str
    repo_url: str
    repo_owner: str
    repo_branch: str
    commit_sha: str
    trigger_event: str
    scenario_name: Optional[str]

    # Raw data
    raw_logs: str
    workflow_run_id: Optional[str]
    github_run_url: Optional[str]

    # Agent outputs
    parsed_failure: Optional[FailureClassification]
    proposed_fix: Optional[ProposedFix]
    validation_result: Optional[ValidationResult]
    incident_report: Optional[IncidentReport]

    # Control flow
    retry_count: int
    max_retries: int
    current_agent: str
    agent_messages: List[Dict]  # trace log

    # Outputs
    pull_request_url: Optional[str]
    github_comment_url: Optional[str]
    workspace_path: Optional[str]
    project_type: Optional[str]
    entry_file: Optional[str]
    execution_error: Optional[str]
    modified_files: Optional[List[str]]

    # Terminal state
    final_status: Optional[str]  # success | failed | partial
    error: Optional[str]