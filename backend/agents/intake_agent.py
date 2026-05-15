"""
Intake Agent
============
Responsibilities:
- Parse GitHub webhook payload
- Fetch full CI/CD failure logs from GitHub API
- Normalize failure context into WorkflowState
- Set up local workspace for fix application

Tools used: GitHub API, log parser

Modes:
  demo     — logs pre-loaded from fixture JSON (no GitHub call)
  real     — fetches live logs from GitHub Actions API using a PAT
  webhook  — same as real but triggered automatically via webhook
"""

import json
import os
import logging
from datetime import datetime
from agents.state import WorkflowState
from tools.github_tool import GitHubTool
from tools.log_parser import LogParser
from config import settings

logger = logging.getLogger(__name__)


def intake_agent(state: WorkflowState) -> WorkflowState:
    """
    Entry point for the intake agent node in LangGraph.
    Fetches logs and normalises the failure context.
    """
    workflow_id = state["workflow_id"]
    logger.info(f"[IntakeAgent] Starting for workflow {workflow_id}")

    new_state = {**state, "current_agent": "intake"}

    try:
        trigger = state.get("trigger_event", "demo")

        # ---------------------------------------------------------------- #
        # DEMO MODE — logs already pre-loaded from fixture                  #
        # ---------------------------------------------------------------- #
        if state.get("raw_logs"):
            logger.info("[IntakeAgent] Using pre-loaded logs (demo/fixture mode)")

        # ---------------------------------------------------------------- #
        # REAL MODE — fetch live logs from GitHub Actions API               #
        # Uses per-request token stored in state (never the global default) #
        # ---------------------------------------------------------------- #
        elif trigger in ("real", "webhook"):
            token = state.get("github_token") or settings.github_token

            if not token:
                raise ValueError(
                    "No GitHub token available. Provide a PAT in the request or set GITHUB_TOKEN."
                )

            owner = state["repo_owner"]
            repo = state["repo_name"].split("/")[-1]
            run_id = state.get("workflow_run_id", "")

            if not run_id:
                raise ValueError("workflow_run_id is required for real/webhook mode.")

            logger.info(f"[IntakeAgent] Fetching real logs for {owner}/{repo} run {run_id}")
            github = GitHubTool(token=token)
            logs = github.get_run_logs_text(
                token=token,
                owner=owner,
                repo=repo,
                run_id=run_id,
            )

            if logs.startswith("["):
                # Indicates an error string from GitHubTool
                raise RuntimeError(f"Log fetch returned error: {logs}")

            new_state["raw_logs"] = logs
            logger.info(f"[IntakeAgent] Fetched {len(logs)} chars of real logs")

        else:
            # Fallback — should not happen in normal flow
            logger.warning("[IntakeAgent] No logs and unknown trigger — using empty logs")
            new_state["raw_logs"] = "[No logs available]"

        # ---------------------------------------------------------------- #
        # Parse logs to extract key signals (shared by all modes)           #
        # ---------------------------------------------------------------- #
        parser = LogParser()
        parsed = parser.extract_signals(new_state["raw_logs"])

        # Set up local workspace directory
        workspace_path = os.path.join(settings.workspace_dir, workflow_id)
        os.makedirs(workspace_path, exist_ok=True)

        # Write raw logs to workspace for reference
        with open(os.path.join(workspace_path, "failure.log"), "w") as f:
            f.write(new_state["raw_logs"])

        new_state["workspace_path"] = workspace_path

        # Append trace event
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "intake",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": (
                f"Logs fetched ({len(new_state['raw_logs'])} chars). "
                f"Signals extracted: {parsed.get('signal_count', 0)}"
            ),
            "data": {"signals": parsed},
        }]

        logger.info(f"[IntakeAgent] Completed. Log size: {len(new_state['raw_logs'])} chars")
        return new_state

    except Exception as e:
        logger.error(f"[IntakeAgent] Failed: {e}")
        new_state["error"] = f"Intake agent failed: {str(e)}"
        new_state["final_status"] = "failed"
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "intake",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "failed",
            "message": str(e),
        }]
        return new_state