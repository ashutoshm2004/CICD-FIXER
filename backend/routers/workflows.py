"""
Workflows Router
================
REST API for querying workflow history and details.
Used by the frontend dashboard.
"""

import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, Workflow
from pydantic import BaseModel

router = APIRouter(prefix="/workflows", tags=["workflows"])
logger = logging.getLogger(__name__)


class WorkflowSummary(BaseModel):
    id: str
    repo_name: str
    branch: str
    status: str
    current_agent: Optional[str]
    trigger_event: str
    scenario_name: Optional[str]
    confidence_score: Optional[float]
    retry_count: int
    pull_request_url: Optional[str]
    created_at: str
    completed_at: Optional[str]

    class Config:
        from_attributes = True


class WorkflowDetail(WorkflowSummary):
    repo_url: Optional[str]
    commit_sha: Optional[str]
    raw_logs: Optional[str]
    parsed_failure: Optional[dict]
    proposed_fix: Optional[dict]
    validation_result: Optional[dict]
    incident_report: Optional[dict]
    agent_trace: Optional[list]
    github_comment_url: Optional[str]


def _parse_json_field(value: Optional[str]) -> Optional[dict | list]:
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None


def _workflow_to_summary(w: Workflow) -> dict:
    return {
        "id": w.id,
        "repo_name": w.repo_name,
        "branch": w.branch or "main",
        "status": w.status,
        "current_agent": w.current_agent,
        "trigger_event": w.trigger_event,
        "scenario_name": w.scenario_name,
        "confidence_score": w.confidence_score,
        "retry_count": w.retry_count or 0,
        "pull_request_url": w.pull_request_url,
        "created_at": w.created_at.isoformat() if w.created_at else "",
        "completed_at": w.completed_at.isoformat() if w.completed_at else None,
    }


def _workflow_to_detail(w: Workflow) -> dict:
    base = _workflow_to_summary(w)
    base.update({
        "repo_url": w.repo_url,
        "commit_sha": w.commit_sha,
        "raw_logs": w.raw_logs,
        "parsed_failure": _parse_json_field(w.parsed_failure),
        "proposed_fix": _parse_json_field(w.proposed_fix),
        "validation_result": _parse_json_field(w.validation_result),
        "incident_report": _parse_json_field(w.incident_report),
        "agent_trace": _parse_json_field(w.agent_trace),
        "github_comment_url": w.github_comment_url,
    })
    return base


@router.get("/", response_model=List[dict])
def list_workflows(
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List recent workflows, newest first."""
    query = db.query(Workflow).order_by(desc(Workflow.created_at))
    if status:
        query = query.filter(Workflow.status == status)
    workflows = query.limit(limit).all()
    return [_workflow_to_summary(w) for w in workflows]


@router.get("/{workflow_id}", response_model=dict)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """Get full workflow detail including agent trace and reports."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _workflow_to_detail(workflow)


@router.get("/{workflow_id}/logs")
def get_workflow_logs(workflow_id: str, db: Session = Depends(get_db)):
    """Get raw logs for a workflow."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"logs": workflow.raw_logs or ""}


@router.get("/{workflow_id}/trace")
def get_agent_trace(workflow_id: str, db: Session = Depends(get_db)):
    """Get the agent trace events for a workflow."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    trace = _parse_json_field(workflow.agent_trace) or []
    return {"trace": trace}


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """Delete a workflow record."""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(workflow)
    db.commit()
    return {"deleted": workflow_id}