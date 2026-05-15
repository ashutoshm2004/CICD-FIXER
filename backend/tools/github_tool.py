"""
GitHub Tool
===========
Wraps GitHub REST API v3 for:
- Fetching workflow run logs
- Creating pull requests
- Posting comments on workflow runs
- Getting repository information
- [NEW] Validating tokens and fetching real repo/run data
"""

import httpx
import logging
import base64
import zipfile
import io
from config import settings

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


class GitHubTool:
    def __init__(self, token: str | None = None):
        # Allow per-request token override (for real-repo mode)
        self.token = token or settings.github_token
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    # ------------------------------------------------------------------ #
    # NEW: Token & user validation                                         #
    # ------------------------------------------------------------------ #

    def validate_token(self, token: str) -> dict | None:
        """
        Validate a GitHub Personal Access Token.
        Returns user info dict if valid, None if invalid.
        """
        try:
            headers = {**self.headers, "Authorization": f"Bearer {token}"}
            with httpx.Client(headers=headers, timeout=10) as client:
                response = client.get(f"{GITHUB_API}/user")
            if response.status_code == 200:
                data = response.json()
                return {
                    "login": data.get("login"),
                    "name": data.get("name"),
                    "avatar_url": data.get("avatar_url"),
                    "public_repos": data.get("public_repos", 0),
                }
            logger.warning(f"[GitHubTool] Token validation failed: {response.status_code}")
            return None
        except Exception as e:
            logger.error(f"[GitHubTool] validate_token error: {e}")
            return None

    # ------------------------------------------------------------------ #
    # NEW: Repo listing                                                    #
    # ------------------------------------------------------------------ #

    def get_user_repos(self, token: str) -> list[dict]:
        """
        List all repos the token has access to (owned + collaborator).
        Returns a list of simplified repo dicts.
        """
        try:
            headers = {**self.headers, "Authorization": f"Bearer {token}"}
            repos = []
            page = 1
            with httpx.Client(headers=headers, timeout=15) as client:
                while True:
                    response = client.get(
                        f"{GITHUB_API}/user/repos",
                        params={
                            "per_page": 100,
                            "page": page,
                            "sort": "updated",
                            "affiliation": "owner,collaborator",
                        },
                    )
                    if response.status_code != 200:
                        logger.warning(f"[GitHubTool] get_user_repos failed: {response.status_code}")
                        break
                    batch = response.json()
                    if not batch:
                        break
                    for r in batch:
                        repos.append({
                            "full_name": r["full_name"],
                            "owner": r["owner"]["login"],
                            "name": r["name"],
                            "private": r["private"],
                            "default_branch": r.get("default_branch", "main"),
                            "html_url": r["html_url"],
                        })
                    if len(batch) < 100:
                        break
                    page += 1
            return repos
        except Exception as e:
            logger.error(f"[GitHubTool] get_user_repos error: {e}")
            return []

    # ------------------------------------------------------------------ #
    # NEW: Failed workflow runs                                            #
    # ------------------------------------------------------------------ #

    def get_failed_workflow_runs(
        self,
        token: str,
        owner: str,
        repo: str,
        limit: int = 10,
    ) -> list[dict]:
        """
        Fetch the most recent failed GitHub Actions workflow runs for a repo.
        Returns simplified run dicts sorted by most recent first.
        """
        try:
            headers = {**self.headers, "Authorization": f"Bearer {token}"}
            with httpx.Client(headers=headers, timeout=15) as client:
                response = client.get(
                    f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs",
                    params={
                        "status": "failure",
                        "per_page": limit,
                    },
                )
            if response.status_code != 200:
                logger.warning(f"[GitHubTool] get_failed_workflow_runs: {response.status_code}")
                return []

            runs = response.json().get("workflow_runs", [])
            return [
                {
                    "id": str(r["id"]),
                    "name": r["name"],
                    "head_branch": r.get("head_branch", ""),
                    "head_sha": r.get("head_sha", ""),
                    "conclusion": r.get("conclusion", ""),
                    "status": r.get("status", ""),
                    "created_at": r.get("created_at", ""),
                    "updated_at": r.get("updated_at", ""),
                    "html_url": r.get("html_url", ""),
                    "workflow_id": r.get("workflow_id"),
                }
                for r in runs
            ]
        except Exception as e:
            logger.error(f"[GitHubTool] get_failed_workflow_runs error: {e}")
            return []

    # ------------------------------------------------------------------ #
    # NEW: Log zip download + extraction                                   #
    # ------------------------------------------------------------------ #

    def get_run_logs_text(
        self,
        token: str,
        owner: str,
        repo: str,
        run_id: str,
        max_chars: int = 80000,
    ) -> str:
        """
        Download the log zip for a workflow run, unzip it, and return
        the concatenated plain-text log content.

        GitHub returns a 302 redirect to a signed S3 URL — httpx
        follows it automatically with follow_redirects=True.
        """
        try:
            headers = {**self.headers, "Authorization": f"Bearer {token}"}
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}/logs"

            with httpx.Client(headers=headers, follow_redirects=True, timeout=60) as client:
                response = client.get(url)

            if response.status_code != 200:
                logger.warning(f"[GitHubTool] Log download failed: {response.status_code}")
                return f"[Log download failed: HTTP {response.status_code}]"

            # Unzip in memory and concatenate all .txt files
            zip_bytes = response.content
            return self._extract_logs_from_zip(zip_bytes, max_chars)

        except zipfile.BadZipFile:
            # Some runs return plain text directly
            logger.warning("[GitHubTool] Response was not a zip — trying plain text")
            return response.text[:max_chars]
        except Exception as e:
            logger.error(f"[GitHubTool] get_run_logs_text error: {e}")
            return f"[Error fetching logs: {str(e)}]"

    def _extract_logs_from_zip(self, zip_bytes: bytes, max_chars: int) -> str:
        """Unzip GitHub log archive and concatenate all .txt log files."""
        parts: list[str] = []
        total = 0

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            # Sort so step logs come in order (0_stepname.txt, 1_stepname.txt …)
            names = sorted(n for n in zf.namelist() if n.endswith(".txt"))
            for name in names:
                try:
                    chunk = zf.read(name).decode("utf-8", errors="replace")
                    parts.append(f"\n--- {name} ---\n{chunk}")
                    total += len(chunk)
                    if total >= max_chars:
                        break
                except Exception:
                    continue

        return "\n".join(parts)[:max_chars]

    # ------------------------------------------------------------------ #
    # EXISTING: Workflow logs (demo/webhook mode)                          #
    # ------------------------------------------------------------------ #

    def get_workflow_logs(self, owner: str, repo: str, run_id: str) -> str:
        """Fetch log archive for a workflow run (uses instance token)."""
        if not run_id:
            return "[No run ID provided — using demo mode]"
        if self.token:
            return self.get_run_logs_text(self.token, owner, repo, run_id)
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}/logs"
            with httpx.Client(headers=self.headers, follow_redirects=True, timeout=30) as client:
                response = client.get(url)
            if response.status_code == 200:
                return response.text[:50000]
            logger.warning(f"[GitHubTool] Log fetch failed: {response.status_code}")
            return f"[Log fetch failed: {response.status_code}]"
        except Exception as e:
            logger.error(f"[GitHubTool] get_workflow_logs error: {e}")
            return f"[Error fetching logs: {str(e)}]"

    # ------------------------------------------------------------------ #
    # EXISTING: Run metadata                                               #
    # ------------------------------------------------------------------ #

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

    # ------------------------------------------------------------------ #
    # EXISTING: PR creation                                                #
    # ------------------------------------------------------------------ #

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
            logger.warning(f"[GitHubTool] PR creation failed: {response.status_code} {response.text[:200]}")
            return ""
        except Exception as e:
            logger.error(f"[GitHubTool] create_pull_request error: {e}")
            return ""

    # ------------------------------------------------------------------ #
    # EXISTING: Commit comment                                             #
    # ------------------------------------------------------------------ #

    def post_workflow_comment(
        self,
        owner: str,
        repo: str,
        run_id: str,
        comment: str,
    ) -> str:
        """Post a comment on a GitHub Actions run (via commit comment)."""
        try:
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

    # ------------------------------------------------------------------ #
    # EXISTING: File contents                                              #
    # ------------------------------------------------------------------ #

    def get_file_contents(self, owner: str, repo: str, path: str, ref: str = "main") -> str:
        """Fetch file contents from GitHub repository."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}?ref={ref}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                response = client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("encoding") == "base64":
                    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return ""
        except Exception as e:
            logger.error(f"[GitHubTool] get_file_contents error: {e}")
            return ""