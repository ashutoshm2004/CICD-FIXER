from fastapi import (
    APIRouter,
    HTTPException,
)
from pydantic import BaseModel
import uuid
import re

from database import (
    SessionLocal,
    Workflow,
)

from tools.github_tool import (
    GitHubTool,
)

from tools.repo_manager import (
    RepoManager,
)

from agents.graph import (
    run_workflow,
)

router = APIRouter(
    prefix="/github",
    tags=["github"],
)


class GitHubAnalyzeRequest(
    BaseModel
):
    repo_url: str
    branch: str = "main"
    workflow_name: str | None = None


def extract_repo(
    repo_url: str
):
    pattern = (
        r"github\.com[:/]"
        r"(.+)/(.+?)"
        r"(?:\.git)?$"
    )

    match = re.search(
        pattern,
        repo_url,
    )

    if not match:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid GitHub "
                "repository URL"
            ),
        )

    return (
        match.group(1),
        match.group(2),
    )


@router.post(
    "/analyze"
)
async def analyze_repository(
    payload:
        GitHubAnalyzeRequest,
):
    owner, repo = (
        extract_repo(
            payload.repo_url
        )
    )

    github = (
        GitHubTool()
    )

    try:
        workflow_id = str(
            uuid.uuid4()
        )

        # ──────────────────────
        # Clone repo
        # ──────────────────────
        repo_manager = (
            RepoManager()
        )

        workspace_path = (
            repo_manager
            .clone_repository(
                repo_url=
                    payload.repo_url,
                workflow_id=
                    workflow_id,
                branch=
                    payload.branch,
            )
        )

        project_type = (
            repo_manager
            .detect_project_type(
                workspace_path
            )
        )

        # ──────────────────────
        # Optional GitHub CI
        # ──────────────────────
        failed_run = None
        logs = ""

        try:
            failed_run = (
                github
                .get_latest_failed_run(
                    owner=owner,
                    repo=repo,
                    branch=
                        payload.branch,
                )
            )

            if failed_run:
                logs = (
                    github
                    .get_workflow_logs(
                        owner=owner,
                        repo=repo,
                        run_id=
                            failed_run[
                                "id"
                            ],
                    )
                )

        except Exception:
            # Ignore CI issues
            pass

        # ──────────────────────
        # Save workflow
        # ──────────────────────
        db = SessionLocal()

        workflow = Workflow(
            id=workflow_id,
            repo_name=
                f"{owner}/{repo}",
            repo_url=
                payload.repo_url,
            branch=
                payload.branch,
            trigger_event=
                "manual",
            scenario_name=
                None,
            status=
                "running",
            current_agent=
                "intake",
            raw_logs=logs,
            confidence_score=
                0.0,
        )

        db.add(workflow)
        db.commit()

        # ──────────────────────
        # Start LangGraph
        # ──────────────────────
        initial_state = {
            "workflow_id":
                workflow_id,

            "repo_name":
                f"{owner}/{repo}",

            "repo_url":
                payload.repo_url,

            "repo_owner":
                owner,

            "repo_branch":
                payload.branch,

            "commit_sha": "",

            "trigger_event":
                "manual",

            "scenario_name":
                None,

            "raw_logs":
                logs,

            "workflow_run_id":
                (
                    str(
                        failed_run[
                            "id"
                        ]
                    )
                    if failed_run
                    else None
                ),

            "github_run_url":
                None,

            "parsed_failure":
                None,

            "proposed_fix":
                None,

            "validation_result":
                None,

            "incident_report":
                None,

            "retry_count":
                0,

            "max_retries":
                2,

            "current_agent":
                "intake",

            "agent_messages":
                [],

            "pull_request_url":
                None,

            "github_comment_url":
                None,

            "workspace_path":
                workspace_path,

            "project_type":
                project_type,

            "entry_file":
                None,

            "execution_error":
                None,

            "modified_files":
                [],

            "final_status":
                None,

            "error":
                None,
        }

        await run_workflow(
            initial_state
        )

        return {
            "success": True,
            "workflow_id":
                workflow_id,

            "repo":
                f"{owner}/{repo}",

            "workspace_path":
                workspace_path,

            "project_type":
                project_type,

            "has_failed_ci":
                failed_run
                is not None,

            "message":
                (
                    "Repository "
                    "analysis "
                    "started."
                ),
        }

    except Exception as e:
        return {
            "success":
                False,
            "type":
                "server_error",
            "message":
                str(e),
        }