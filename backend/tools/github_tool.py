"""
GitHub Tool
===========
Wraps GitHub REST API v3 for:
- Fetching workflow run logs
- Creating pull requests
- Posting comments on workflow runs
- Getting repository information
"""

import httpx
import logging
from config import settings
import requests

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


class GitHubTool:
    def __init__(self):
        self.token = settings.github_token
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    def get_workflow_logs(self, owner: str, repo: str, run_id: str) -> str:
        """Fetch log archive for a workflow run."""
        if not run_id:
            return "[No run ID provided — using demo mode]"

        try:
            # Get the log download URL
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}/logs"
            with httpx.Client(headers=self.headers, follow_redirects=True, timeout=30) as client:
                response = client.get(url)

            if response.status_code == 200:
                # GitHub returns a zip; for simplicity decode the text content
                return response.text[:50000]
            else:
                logger.warning(f"[GitHubTool] Log fetch failed: {response.status_code}")
                return f"[Log fetch failed: {response.status_code}]"

        except Exception as e:
            logger.error(f"[GitHubTool] get_workflow_logs error: {e}")
            return f"[Error fetching logs: {str(e)}]"

    def get_run_info(self, owner: str, repo: str, run_id: str) -> dict:
        """Get workflow run metadata."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                response = client.get(url)
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"[GitHubTool] get_run_info error: {e}")
            return {}

    def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        branch: str,
        base_branch: str = "main",
    ) -> str:
        """Create a pull request. Returns PR URL."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"
            payload = {
                "title": title,
                "body": body,
                "head": branch,
                "base": base_branch,
                "draft": True,
            }
            with httpx.Client(headers=self.headers, timeout=15) as client:
                response = client.post(url, json=payload)

            if response.status_code in (200, 201):
                pr_url = response.json().get("html_url", "")
                logger.info(f"[GitHubTool] PR created: {pr_url}")
                return pr_url
            else:
                logger.warning(f"[GitHubTool] PR creation failed: {response.status_code} {response.text[:200]}")
                return ""

        except Exception as e:
            logger.error(f"[GitHubTool] create_pull_request error: {e}")
            return ""

    def post_workflow_comment(
        self,
        owner: str,
        repo: str,
        run_id: str,
        comment: str,
    ) -> str:
        """Post a comment on a GitHub Actions run (via commit comment)."""
        try:
            # Get the commit SHA for the run
            run_info = self.get_run_info(owner, repo, run_id)
            sha = run_info.get("head_sha", "")

            if not sha:
                return ""

            url = f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}/comments"
            payload = {"body": comment}

            with httpx.Client(headers=self.headers, timeout=15) as client:
                response = client.post(url, json=payload)

            if response.status_code in (200, 201):
                return response.json().get("html_url", "")
            return ""

        except Exception as e:
            logger.error(f"[GitHubTool] post_workflow_comment error: {e}")
            return ""

    def get_file_contents(self, owner: str, repo: str, path: str, ref: str = "main") -> str:
        """Fetch file contents from GitHub repository."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}?ref={ref}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                response = client.get(url)

            if response.status_code == 200:
                import base64
                data = response.json()
                if data.get("encoding") == "base64":
                    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return ""

        except Exception as e:
            logger.error(f"[GitHubTool] get_file_contents error: {e}")
            return ""

    def get_latest_failed_run(
        self,
        owner: str,
        repo: str,
        branch: str = "main",
    ):
        url = (
            f"https://api.github.com/repos/"
            f"{owner}/{repo}/actions/runs"
        )

        response = requests.get(
            url,
            headers=self.headers,
            params={
                "branch": branch,
                "status": "completed",
                "per_page": 10,
            },
        )

        response.raise_for_status()

        runs = response.json().get(
            "workflow_runs",
            [],
        )

        failed_runs = [
            r
            for r in runs
            if r["conclusion"] == "failure"
        ]

        return failed_runs[0] if failed_runs else None


    def get_workflow_logs(
        self,
        owner: str,
        repo: str,
        run_id: int,
    ):
        jobs_url = (
            f"https://api.github.com/repos/"
            f"{owner}/{repo}/actions/runs/"
            f"{run_id}/jobs"
        )

        response = requests.get(
            jobs_url,
            headers=self.headers,
        )

        response.raise_for_status()

        jobs = response.json().get(
            "jobs",
            [],
        )

        logs = []

        for job in jobs:
            logs.append(
                f"JOB: {job['name']}"
            )

            for step in job.get("steps", []):
                if step["conclusion"] == "failure":
                    logs.append(
                        f"FAILED STEP: "
                        f"{step['name']}"
                    )

        return "\n".join(logs)