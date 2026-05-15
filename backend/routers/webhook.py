"""
Webhook Router
==============
Receives and validates GitHub webhook events.
Triggers the multi-agent workflow pipeline.
"""

import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from sqlalchemy.orm import Session
from fastapi import Depends

from agents.graph import run_workflow
from agents.state import WorkflowState
from config import settings
from database import get_db, Workflow

router = APIRouter(prefix="/webhook", tags=["webhook"])
logger = logging.getLogger(__name__)


def _verify_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook HMAC signature."""
    if not signature:
        return settings.demo_mode  # Allow unsigned in demo mode

    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


async def _process_webhook(workflow_id: str, state: WorkflowState, db: Session):
    """Background task: runs the full multi-agent pipeline."""
    logger.info(f"[Webhook] Starting pipeline for workflow {workflow_id}")

    # Update DB: running
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if db_workflow:
        db_workflow.status = "running"
        db_workflow.current_agent = "intake"
        db.commit()

    try:
        final_state = await run_workflow(state)

        # Update DB with results
        db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if db_workflow:
            db_workflow.status = final_state.get("final_status", "failed")
            db_workflow.current_agent = final_state.get("current_agent", "")
            db_workflow.raw_logs = final_state.get("raw_logs", "")[:10000]
            db_workflow.parsed_failure = json.dumps(final_state.get("parsed_failure", {}))
            db_workflow.proposed_fix = json.dumps(final_state.get("proposed_fix", {}))
            db_workflow.validation_result = json.dumps(final_state.get("validation_result", {}))
            db_workflow.incident_report = json.dumps(final_state.get("incident_report", {}))
            db_workflow.agent_trace = json.dumps(final_state.get("agent_messages", []))
            db_workflow.confidence_score = final_state.get("parsed_failure", {}).get("confidence", 0)
            db_workflow.retry_count = final_state.get("retry_count", 0)
            db_workflow.pull_request_url = final_state.get("pull_request_url")
            db_workflow.github_comment_url = final_state.get("github_comment_url")
            db_workflow.completed_at = datetime.utcnow()
            db.commit()

        logger.info(f"[Webhook] Pipeline complete for {workflow_id}: {final_state.get('final_status')}")

    except Exception as e:
        logger.error(f"[Webhook] Pipeline failed for {workflow_id}: {e}")
        db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if db_workflow:
            db_workflow.status = "failed"
            db_workflow.completed_at = datetime.utcnow()
            db.commit()


@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Receive GitHub webhook events.
    Supported events: workflow_run (completed + failure)
    """
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")

    # Verify signature
    if not _verify_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    # Parse payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Only process workflow_run failures
    if event_type != "workflow_run":
        return Response(content="OK", status_code=200)

    workflow_run = payload.get("workflow_run", {})
    conclusion = workflow_run.get("conclusion", "")
    status = workflow_run.get("status", "")

    if status != "completed" or conclusion != "failure":
        return Response(content="Not a failure event", status_code=200)

    # Extract repository info
    repo = payload.get("repository", {})
    repo_name = repo.get("full_name", "unknown/repo")
    repo_url = repo.get("html_url", "")
    owner = repo.get("owner", {}).get("login", "")
    branch = workflow_run.get("head_branch", "main")
    commit_sha = workflow_run.get("head_sha", "")
    run_id = str(workflow_run.get("id", ""))

    # Create workflow record
    workflow_id = str(uuid.uuid4())
    db_workflow = Workflow(
        id=workflow_id,
        repo_name=repo_name,
        repo_url=repo_url,
        branch=branch,
        commit_sha=commit_sha,
        trigger_event="webhook",
        status="pending",
        current_agent="intake",
    )
    db.add(db_workflow)
    db.commit()

    # Build initial state
    initial_state: WorkflowState = {
        "workflow_id": workflow_id,
        "repo_name": repo_name,
        "repo_url": repo_url,
        "repo_owner": owner,
        "repo_branch": branch,
        "commit_sha": commit_sha,
        "trigger_event": "webhook",
        "scenario_name": None,
        "raw_logs": "",
        "workflow_run_id": run_id,
        "github_run_url": workflow_run.get("html_url", ""),
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

    # Kick off background pipeline
    background_tasks.add_task(_process_webhook, workflow_id, initial_state, db)

    logger.info(f"[Webhook] Accepted workflow_run failure for {repo_name}, workflow_id={workflow_id}")
    return {"workflow_id": workflow_id, "status": "accepted"}