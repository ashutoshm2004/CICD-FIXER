"""
Demo Router
===========
Triggers pre-built demo scenarios for hackathon demonstrations.
All scenarios use fixture data — no real GitHub needed.
"""

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from agents.graph import run_workflow
from agents.state import WorkflowState
from config import settings
from database import get_db, Workflow
from demo.scenarios import load_scenario, list_scenarios

router = APIRouter(prefix="/demo", tags=["demo"])
logger = logging.getLogger(__name__)


async def _run_demo_pipeline(workflow_id: str, state: WorkflowState, db: Session):
    """Background task: runs the multi-agent pipeline for a demo scenario."""
    logger.info(f"[Demo] Starting demo pipeline for {workflow_id}")

    # Mark as running
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

    # Create workflow record
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

    # Build initial workflow state with fixture logs
    initial_state: WorkflowState = {
        "workflow_id": workflow_id,
        "repo_name": scenario["repo_name"],
        "repo_url": f"https://github.com/{scenario['repo_name']}",
        "repo_owner": scenario.get("repo_owner", "demo"),
        "repo_branch": scenario.get("branch", "main"),
        "commit_sha": scenario.get("commit_sha", "demo"),
        "trigger_event": "demo",
        "scenario_name": scenario_key,
        # Pre-load fixture logs (no GitHub API call needed)
        "raw_logs": scenario["logs"],
        "workflow_run_id": "demo-run-001",
        "github_run_url": f"https://github.com/{scenario['repo_name']}/actions/runs/demo",
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

    background_tasks.add_task(_run_demo_pipeline, workflow_id, initial_state, db)

    return {
        "workflow_id": workflow_id,
        "scenario": scenario_key,
        "display_name": scenario["display_name"],
        "estimated_seconds": scenario["estimated_seconds"],
        "status": "pending",
    }


@router.delete("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Delete all demo workflow records. Fresh start for demos."""
    demo_workflows = db.query(Workflow).filter(Workflow.trigger_event == "demo").all()
    count = len(demo_workflows)
    for w in demo_workflows:
        db.delete(w)
    db.commit()
    return {"deleted": count, "message": f"Deleted {count} demo workflows"}