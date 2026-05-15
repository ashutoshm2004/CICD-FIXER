"""
Demo Router
===========
Triggers pre-built demo scenarios for hackathon demonstrations.
All scenarios use fixture data — no real GitHub needed.

Also exposes /real/trigger for manually triggering analysis of a
real GitHub Actions failed run without needing a webhook.
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
from demo.scenarios import load_scenario, list_scenarios
from tools.github_tool import GitHubTool

router = APIRouter(prefix="/demo", tags=["demo"])
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
# Shared pipeline runner (used by both demo and real triggers)        #
# ------------------------------------------------------------------ #

async def _run_pipeline(workflow_id: str, state: WorkflowState, db: Session):
    """Background task: runs the multi-agent pipeline."""
    logger.info(f"[Demo] Starting pipeline for {workflow_id} (trigger={state['trigger_event']})")

    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if db_workflow:
        db_workflow.status = "running"
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

        logger.info(f"[Demo] Completed: {workflow_id} → {final_state.get('final_status')}")

    except Exception as e:
        logger.error(f"[Demo] Pipeline error for {workflow_id}: {e}")
        db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if db_workflow:
            db_workflow.status = "failed"
            db_workflow.completed_at = datetime.utcnow()
            db.commit()


# ------------------------------------------------------------------ #
# EXISTING: Demo scenario endpoints                                    #
# ------------------------------------------------------------------ #

@router.get("/scenarios")
def get_scenarios():
    """List all available demo scenarios."""
    return {"scenarios": list_scenarios()}


@router.post("/trigger/{scenario_key}")
async def trigger_demo(
    scenario_key: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Trigger a demo scenario. Uses fixture logs — no GitHub needed.
    Returns immediately with workflow_id; processing happens in background.
    """
    try:
        scenario = load_scenario(scenario_key)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    workflow_id = str(uuid.uuid4())

    db_workflow = Workflow(
        id=workflow_id,
        repo_name=scenario["repo_name"],
        repo_url=f"https://github.com/{scenario['repo_name']}",
        branch=scenario.get("branch", "main"),
        commit_sha=scenario.get("commit_sha", "demo"),
        trigger_event="demo",
        scenario_name=scenario["display_name"],
        status="pending",
        current_agent="intake",
    )
    db.add(db_workflow)
    db.commit()

    initial_state: WorkflowState = {
        "workflow_id": workflow_id,
        "repo_name": scenario["repo_name"],
        "repo_url": f"https://github.com/{scenario['repo_name']}",
        "repo_owner": scenario.get("repo_owner", "demo"),
        "repo_branch": scenario.get("branch", "main"),
        "commit_sha": scenario.get("commit_sha", "demo"),
        "trigger_event": "demo",
        "scenario_name": scenario_key,
        "raw_logs": scenario["logs"],
        "workflow_run_id": "demo-run-001",
        "github_run_url": f"https://github.com/{scenario['repo_name']}/actions/runs/demo",
        "github_token": None,
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

    return {
        "workflow_id": workflow_id,
        "scenario": scenario_key,
        "display_name": scenario["display_name"],
        "estimated_seconds": scenario["estimated_seconds"],
        "status": "pending",
    }


@router.delete("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Delete all demo workflow records."""
    demo_workflows = db.query(Workflow).filter(Workflow.trigger_event == "demo").all()
    count = len(demo_workflows)
    for w in demo_workflows:
        db.delete(w)
    db.commit()
    return {"deleted": count, "message": f"Deleted {count} demo workflows"}


# ------------------------------------------------------------------ #
# NEW: Real repo trigger endpoint                                      #
# ------------------------------------------------------------------ #

class RealTriggerRequest(BaseModel):
    token: str          # GitHub PAT with repo + actions:read scopes
    owner: str          # GitHub username or org
    repo: str           # Repository name (without owner prefix)
    run_id: str         # The failed workflow run ID


@router.post("/real/trigger")
async def trigger_real(
    body: RealTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Manually trigger analysis of a real failed GitHub Actions run.
    No webhook needed — user provides their PAT, owner, repo, and run_id.

    The PAT is stored only in the in-memory workflow state for the
    duration of this run and is never persisted to the database.
    """
    github = GitHubTool(token=body.token)

    # 1. Validate the token
    user_info = github.validate_token(body.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid GitHub token. Check your PAT and scopes.")

    # 2. Verify the run exists and actually failed
    run_info = github.get_run_info(body.owner, body.repo, body.run_id)
    if not run_info:
        raise HTTPException(
            status_code=404,
            detail=f"Workflow run {body.run_id} not found in {body.owner}/{body.repo}.",
        )

    conclusion = run_info.get("conclusion", "")
    status = run_info.get("status", "")

    if status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Run {body.run_id} has not completed yet (status={status}).",
        )
    if conclusion != "failure":
        raise HTTPException(
            status_code=400,
            detail=f"Run {body.run_id} did not fail (conclusion={conclusion}). Only failed runs can be analysed.",
        )

    # 3. Build database record
    repo_full = f"{body.owner}/{body.repo}"
    workflow_id = str(uuid.uuid4())

    db_workflow = Workflow(
        id=workflow_id,
        repo_name=repo_full,
        repo_url=f"https://github.com/{repo_full}",
        branch=run_info.get("head_branch", "main"),
        commit_sha=run_info.get("head_sha", ""),
        trigger_event="real",
        scenario_name=None,
        status="pending",
        current_agent="intake",
    )
    db.add(db_workflow)
    db.commit()

    # 4. Build initial state — token is in state, not in DB
    initial_state: WorkflowState = {
        "workflow_id": workflow_id,
        "repo_name": repo_full,
        "repo_url": f"https://github.com/{repo_full}",
        "repo_owner": body.owner,
        "repo_branch": run_info.get("head_branch", "main"),
        "commit_sha": run_info.get("head_sha", ""),
        "trigger_event": "real",
        "scenario_name": None,
        "raw_logs": "",          # intake_agent fetches this
        "workflow_run_id": body.run_id,
        "github_run_url": run_info.get("html_url", ""),
        "github_token": body.token,   # passed through agent graph
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

    logger.info(
        f"[Demo] Real trigger accepted: {repo_full} run={body.run_id} "
        f"user={user_info['login']} workflow_id={workflow_id}"
    )

    return {
        "workflow_id": workflow_id,
        "repo": repo_full,
        "run_id": body.run_id,
        "triggered_by": user_info["login"],
        "status": "pending",
        "message": "Pipeline started. Poll /workflows/{workflow_id} for progress.",
    }


# ------------------------------------------------------------------ #
# NEW: GitHub data proxy endpoints (called by frontend)               #
# ------------------------------------------------------------------ #

@router.get("/github/user")
def validate_github_token(token: str):
    """Validate a PAT and return basic user info."""
    github = GitHubTool(token=token)
    user_info = github.validate_token(token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token or insufficient scopes.")
    return user_info


@router.get("/github/repos")
def list_github_repos(token: str):
    """List repos accessible by the provided PAT."""
    github = GitHubTool(token=token)
    user_info = github.validate_token(token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token.")
    repos = github.get_user_repos(token)
    return {"repos": repos, "user": user_info}


@router.get("/github/runs")
def list_failed_runs(token: str, owner: str, repo: str):
    """List the most recent failed workflow runs for a repo."""
    github = GitHubTool(token=token)
    user_info = github.validate_token(token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token.")
    runs = github.get_failed_workflow_runs(token, owner, repo, limit=15)
    return {"runs": runs, "owner": owner, "repo": repo}