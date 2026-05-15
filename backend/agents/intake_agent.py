"""
Intake Agent
============
Responsibilities:
- Parse GitHub webhook payload
- Fetch full CI/CD failure logs from GitHub API
- Normalize failure context into WorkflowState
- Set up local workspace for fix application

Tools used: GitHub API, log parser
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
    Fetches logs and normalizes the failure context.
    """
    workflow_id = state["workflow_id"]
    logger.info(f"[IntakeAgent] Starting for workflow {workflow_id}")

    new_state = {**state, "current_agent": "intake"}

    try:
        # In demo mode, logs are already populated from the fixture
        if state.get("raw_logs"):
            logger.info("[IntakeAgent] Using pre-loaded logs (demo/fixture mode)")
        else:
            # Fetch logs from GitHub API
            github = GitHubTool()
            logs = github.get_workflow_logs(
                owner=state["repo_owner"],
                repo=state["repo_name"].split("/")[-1],
                run_id=state.get("workflow_run_id", ""),
            )
            new_state["raw_logs"] = logs

        # Parse the logs to extract key signals
        parser = LogParser()
        parsed = parser.extract_signals(new_state["raw_logs"])

        # Set up local workspace directory
        workspace_path = os.path.join(
            settings.workspace_dir,
            workflow_id
        )
        os.makedirs(workspace_path, exist_ok=True)

        # Write raw logs to workspace for reference
        with open(os.path.join(workspace_path, "failure.log"), "w", encoding="utf-8") as f:
            f.write(new_state["raw_logs"])

        new_state["workspace_path"] = workspace_path

        # Append trace event
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "intake",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": f"Logs fetched ({len(new_state['raw_logs'])} chars). Signals extracted: {parsed.get('signal_count', 0)}",
            "data": {"signals": parsed}
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