"""
Repo Router
===========
Provides a direct API endpoint to analyze a GitHub repository's
failed workflow run without needing a webhook.

POST /repo/analyze   — takes repo URL + run ID, starts full pipeline
GET  /repo/runs      — lists recent failed runs for a repo
GET  /repo/validate  — checks if token can access a repo
"""

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.graph import run_workflow
from agents.state import WorkflowState
from config import settings
from database import get_db, Workflow
from tools.github_tool import GitHubTool

router = APIRouter(prefix="/repo", tags=["repo"])
logger = logging.getLogger(__name__)


# ── Request / Response models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    repo_url: str          # e.g. https://github.com/owner/repo
    run_id: str            # GitHub Actions run ID
    branch: str = "main"


class ValidateRequest(BaseModel):
    repo_url: str


class RecentRunsRequest(BaseModel):
    repo_url: str
    limit: int = 10


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_repo_url(repo_url: str) -> tuple[str, str]:
    """
    Parse https://github.com/owner/repo → (owner, repo)
    Raises ValueError if format is invalid.
    """
    url = repo_url.rstrip("/").replace("https://github.com/", "").replace("http://github.com/", "")
    parts = url.split("/")
    if len(parts) < 2:
        raise ValueError(f"Invalid GitHub repo URL: {repo_url}")
    return parts[0], parts[1]


async def _run_pipeline(workflow_id: str, state: WorkflowState, db: Session):
    """Background task: runs the full multi-agent pipeline."""
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if db_workflow:
        db_workflow.status = "running"
        db_workflow.current_agent = "intake"
        db.commit()

    try:
        final_state = await run_workflow(state)

        db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if db_workflow:
            db_workflow.status = final_state.get("final_status", "failed")
            db_workflow.current_agent = final_state.get("current_agent", "")
            db_workflow.raw_logs = (final_state.get("raw_logs") or "")[:10000]
            db_workflow.parsed_failure = json.dumps(final_state.get("parsed_failure") or {})
            db_workflow.proposed_fix = json.dumps(final_state.get("proposed_fix") or {})
            db_workflow.validation_result = json.dumps(final_state.get("validation_result") or {})
            db_workflow.incident_report = json.dumps(final_state.get("incident_report") or {})
            db_workflow.agent_trace = json.dumps(final_state.get("agent_messages") or [])
            db_workflow.confidence_score = (final_state.get("parsed_failure") or {}).get("confidence", 0)
            db_workflow.retry_count = final_state.get("retry_count", 0)
            db_workflow.pull_request_url = final_state.get("pull_request_url")
            db_workflow.github_comment_url = final_state.get("github_comment_url")
            db_workflow.completed_at = datetime.utcnow()
            db.commit()

        logger.info(f"[Repo] Pipeline complete for {workflow_id}: {final_state.get('final_status')}")

    except Exception as e:
        logger.error(f"[Repo] Pipeline failed for {workflow_id}: {e}", exc_info=True)
        db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if db_workflow:
            db_workflow.status = "failed"
            db_workflow.completed_at = datetime.utcnow()
            db.commit()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/validate")
def validate_repo_access(body: ValidateRequest):
    """
    Check whether the configured GITHUB_TOKEN can access the given repo.
    Returns repo metadata if accessible.
    """
    if not settings.github_token:
        raise HTTPException(
            status_code=400,
            detail="No GITHUB_TOKEN configured. Add it to your .env file."
        )

    try:
        owner, repo = _parse_repo_url(body.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    github = GitHubTool()
    info = github.get_repo_info(owner, repo)

    if not info:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot access {owner}/{repo}. Check your GITHUB_TOKEN has 'repo' scope."
        )

    return {
        "accessible": True,
        "full_name": info.get("full_name"),
        "default_branch": info.get("default_branch", "main"),
        "private": info.get("private", False),
        "description": info.get("description", ""),
        "has_actions": True,
    }


@router.post("/recent-runs")
def get_recent_failed_runs(body: RecentRunsRequest):
    """
    List recent failed workflow runs for a repository.
    Useful for the frontend dropdown to pick a run ID.
    """
    if not settings.github_token:
        raise HTTPException(status_code=400, detail="No GITHUB_TOKEN configured.")

    try:
        owner, repo = _parse_repo_url(body.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    github = GitHubTool()
    runs = github.get_failed_runs(owner, repo, limit=body.limit)

    return {"runs": runs, "repo": f"{owner}/{repo}"}


@router.post("/analyze")
async def analyze_repo(
    body: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Manually trigger analysis of a failed GitHub Actions run.

    Steps:
    1. Validates repo URL and run ID
    2. Creates a workflow record in DB
    3. Kicks off the full 6-agent pipeline in background
    4. Returns workflow_id immediately for polling
    """
    if not settings.github_token:
        raise HTTPException(
            status_code=400,
            detail="No GITHUB_TOKEN set. Add GITHUB_TOKEN=ghp_xxx to your .env file."
        )

    try:
        owner, repo_name = _parse_repo_url(body.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Validate token can access the repo
    github = GitHubTool()
    repo_info = github.get_repo_info(owner, repo_name)
    if not repo_info:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot access {owner}/{repo_name}. Check GITHUB_TOKEN permissions."
        )

    # Validate run exists
    run_info = github.get_run_info(owner, repo_name, body.run_id)
    if not run_info:
        raise HTTPException(
            status_code=404,
            detail=f"Run ID {body.run_id} not found in {owner}/{repo_name}."
        )

    full_name = f"{owner}/{repo_name}"
    workflow_id = str(uuid.uuid4())
    branch = run_info.get("head_branch", body.branch)
    commit_sha = run_info.get("head_sha", "")
    run_url = run_info.get("html_url", "")

    # Create DB record
    db_workflow = Workflow(
        id=workflow_id,
        repo_name=full_name,
        repo_url=body.repo_url,
        branch=branch,
        commit_sha=commit_sha,
        trigger_event="manual",
        status="pending",
        current_agent="intake",
    )
    db.add(db_workflow)
    db.commit()

    # Build initial state — no pre-loaded logs, intake agent will fetch them
    initial_state: WorkflowState = {
        "workflow_id": workflow_id,
        "repo_name": full_name,
        "repo_url": body.repo_url,
        "repo_owner": owner,
        "repo_branch": branch,
        "commit_sha": commit_sha,
        "trigger_event": "manual",
        "scenario_name": None,
        "raw_logs": "",                  # intake agent fetches this
        "workflow_run_id": body.run_id,
        "github_run_url": run_url,
        "parsed_failure": None,
        "proposed_fix": None,
        "validation_result": None,
        "incident_report": None,
        "retry_count": 0,
        "max_retries": settings.max_retries,
        "current_agent": "intake",
        "agent_messages": [],
        "pull_request_url": None,
        "github_comment_url": None,
        "workspace_path": None,
        "final_status": None,
        "error": None,
    }

    background_tasks.add_task(_run_pipeline, workflow_id, initial_state, db)

    logger.info(f"[Repo] Analysis started for {full_name} run={body.run_id} workflow={workflow_id}")

    return {
        "workflow_id": workflow_id,
        "repo": full_name,
        "run_id": body.run_id,
        "branch": branch,
        "status": "accepted",
        "message": f"Pipeline started. Fetching logs from run #{body.run_id}.",
    }