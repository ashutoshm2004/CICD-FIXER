"""
GitHub Tool
===========
Wraps GitHub REST API v3 for:
- Fetching workflow run logs (with zip extraction)
- Getting repo / run metadata
- Listing recent failed runs
- Creating branches + committing fix files
- Creating pull requests
- Posting comments
"""

import base64
import io
import logging
import zipfile
from typing import Optional

import httpx

from config import settings

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

    # ── Repo info ─────────────────────────────────────────────────────────────

    def get_repo_info(self, owner: str, repo: str) -> dict:
        """Get repository metadata. Returns {} if not accessible."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.get(url)
            if r.status_code == 200:
                return r.json()
            logger.warning(f"[GitHubTool] get_repo_info {owner}/{repo}: {r.status_code}")
            return {}
        except Exception as e:
            logger.error(f"[GitHubTool] get_repo_info error: {e}")
            return {}

    def get_default_branch(self, owner: str, repo: str) -> str:
        info = self.get_repo_info(owner, repo)
        return info.get("default_branch", "main")

    # ── Workflow runs ─────────────────────────────────────────────────────────

    def get_run_info(self, owner: str, repo: str, run_id: str) -> dict:
        """Get workflow run metadata."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.get(url)
            return r.json() if r.status_code == 200 else {}
        except Exception as e:
            logger.error(f"[GitHubTool] get_run_info error: {e}")
            return {}

    def get_failed_runs(self, owner: str, repo: str, limit: int = 10) -> list:
        """List recent failed workflow runs for a repository."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs"
            params = {"status": "failure", "per_page": limit}
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.get(url, params=params)
            if r.status_code != 200:
                return []
            runs = r.json().get("workflow_runs", [])
            return [
                {
                    "id": str(run["id"]),
                    "name": run.get("name", ""),
                    "branch": run.get("head_branch", ""),
                    "conclusion": run.get("conclusion", ""),
                    "created_at": run.get("created_at", ""),
                    "html_url": run.get("html_url", ""),
                    "commit_message": run.get("head_commit", {}).get("message", "")[:80],
                }
                for run in runs
            ]
        except Exception as e:
            logger.error(f"[GitHubTool] get_failed_runs error: {e}")
            return []

    # ── Logs ──────────────────────────────────────────────────────────────────

    def get_workflow_logs(self, owner: str, repo: str, run_id: str) -> str:
        """
        Fetch and extract log text for a workflow run.
        GitHub returns a zip archive; we extract all .txt files.
        """
        if not run_id:
            return "[No run ID provided]"

        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}/logs"
            with httpx.Client(
                headers=self.headers,
                follow_redirects=True,
                timeout=60,
            ) as client:
                r = client.get(url)

            if r.status_code != 200:
                logger.warning(f"[GitHubTool] Log fetch {run_id}: HTTP {r.status_code}")
                return f"[Log fetch failed: HTTP {r.status_code}]"

            try:
                with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                    parts = []
                    for name in sorted(zf.namelist()):
                        if name.endswith(".txt"):
                            try:
                                text = zf.read(name).decode("utf-8", errors="replace")
                                parts.append(f"=== {name} ===\n{text}")
                            except Exception:
                                pass
                    combined = "\n\n".join(parts)
                    return combined[:60000]
            except zipfile.BadZipFile:
                return r.text[:60000]

        except Exception as e:
            logger.error(f"[GitHubTool] get_workflow_logs error: {e}")
            return f"[Error fetching logs: {str(e)}]"

    # ── File contents ─────────────────────────────────────────────────────────

    def get_file_contents(
        self, owner: str, repo: str, path: str, ref: str = "main"
    ) -> Optional[str]:
        """Fetch file contents from repository. Returns None if not found."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.get(url, params={"ref": ref})
            if r.status_code == 200:
                data = r.json()
                if data.get("encoding") == "base64":
                    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return None
        except Exception as e:
            logger.error(f"[GitHubTool] get_file_contents error: {e}")
            return None

    def get_file_sha(
        self, owner: str, repo: str, path: str, ref: str = "main"
    ) -> Optional[str]:
        """Get the blob SHA of a file (needed to update it via API)."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.get(url, params={"ref": ref})
            if r.status_code == 200:
                return r.json().get("sha")
            return None
        except Exception as e:
            logger.error(f"[GitHubTool] get_file_sha error: {e}")
            return None

    # ── Branch management ─────────────────────────────────────────────────────

    def get_branch_sha(self, owner: str, repo: str, branch: str) -> Optional[str]:
        """Get the latest commit SHA of a branch."""
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/git/refs/heads/{branch}"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.get(url)
            if r.status_code == 200:
                return r.json().get("object", {}).get("sha")
            return None
        except Exception as e:
            logger.error(f"[GitHubTool] get_branch_sha error: {e}")
            return None

    def create_branch(
        self, owner: str, repo: str, new_branch: str, from_branch: str = "main"
    ) -> bool:
        """Create a new branch from an existing branch."""
        try:
            sha = self.get_branch_sha(owner, repo, from_branch)
            if not sha:
                logger.error(f"[GitHubTool] Cannot get SHA for branch '{from_branch}' — does it exist?")
                return False

            url = f"{GITHUB_API}/repos/{owner}/{repo}/git/refs"
            payload = {"ref": f"refs/heads/{new_branch}", "sha": sha}
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.post(url, json=payload)

            if r.status_code in (200, 201):
                logger.info(f"[GitHubTool] Created branch '{new_branch}' from '{from_branch}' (sha={sha[:8]})")
                return True
            elif r.status_code == 422:
                logger.info(f"[GitHubTool] Branch '{new_branch}' already exists — reusing")
                return True
            else:
                logger.error(
                    f"[GitHubTool] create_branch failed: HTTP {r.status_code} — {r.text[:300]}"
                )
                return False
        except Exception as e:
            logger.error(f"[GitHubTool] create_branch error: {e}")
            return False

    # ── Commit files ──────────────────────────────────────────────────────────

    def commit_file(
        self,
        owner: str,
        repo: str,
        path: str,
        content: str,
        message: str,
        branch: str,
    ) -> bool:
        """
        Create or update a single file on a branch via the GitHub Contents API.
        """
        try:
            existing_sha = self.get_file_sha(owner, repo, path, ref=branch)

            url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
            payload = {
                "message": message,
                "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
                "branch": branch,
            }
            if existing_sha:
                payload["sha"] = existing_sha

            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.put(url, json=payload)

            if r.status_code in (200, 201):
                logger.info(f"[GitHubTool] ✅ Committed '{path}' to '{branch}'")
                return True
            else:
                logger.error(
                    f"[GitHubTool] ❌ commit_file failed for '{path}': "
                    f"HTTP {r.status_code} — {r.text[:400]}"
                )
                return False
        except Exception as e:
            logger.error(f"[GitHubTool] commit_file error for '{path}': {e}")
            return False

    def commit_patches(
        self,
        owner: str,
        repo: str,
        branch: str,
        patches: list,
        base_branch: str = "main",
    ) -> bool:
        """
        Apply a list of patch dicts to a branch.

        Each patch must have:
          - file        : repo-relative path
          - replacement : complete new file content  (set by fix_agent)
          - explanation : human-readable reason

        Falls back to the legacy 'content' key for backwards compatibility.
        Patches missing both keys are skipped with a clear warning.

        Returns True if at least one file was committed.
        """
        logger.info(
            f"[GitHubTool] commit_patches called: "
            f"{len(patches)} patch(es), branch='{branch}', base='{base_branch}'"
        )

        created = self.create_branch(owner, repo, branch, from_branch=base_branch)
        if not created:
            logger.error(f"[GitHubTool] Aborting commit_patches: could not create branch '{branch}'")
            return False

        committed = 0
        for i, patch in enumerate(patches):
            file_path = patch.get("file", "")

            # 'replacement' is the canonical key written by fix_agent.
            # Fall back to 'content' for any legacy patches.
            new_content = patch.get("replacement") or patch.get("content") or ""
            explanation = patch.get("explanation", "Automated fix")

            logger.debug(
                f"[GitHubTool] Patch[{i}] file={file_path!r} "
                f"replacement_len={len(patch.get('replacement') or '')} "
                f"content_len={len(patch.get('content') or '')} "
                f"resolved_len={len(new_content)}"
            )

            if not file_path:
                logger.warning(f"[GitHubTool] Patch[{i}] skipped: missing 'file' key")
                continue

            if not new_content:
                logger.warning(
                    f"[GitHubTool] Patch[{i}] skipped for '{file_path}': "
                    "both 'replacement' and 'content' are empty — "
                    "this is an advisory-only patch and cannot be committed. "
                    "Check that fix_agent is populating the 'replacement' field."
                )
                continue

            success = self.commit_file(
                owner=owner,
                repo=repo,
                path=file_path,
                content=new_content,
                message=f"fix: {explanation[:72]}",
                branch=branch,
            )
            if success:
                committed += 1

        logger.info(
            f"[GitHubTool] commit_patches done: "
            f"{committed}/{len(patches)} committed to '{branch}'"
        )
        return committed > 0

    # ── Pull Requests ─────────────────────────────────────────────────────────

    def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        branch: str,
        base_branch: str = "main",
    ) -> str:
        """
        Create a pull request. Returns PR URL or empty string on failure.

        NOTE: draft=True is intentionally omitted here.
        GitHub only supports draft PRs on Pro/Team/Enterprise plans.
        Using draft=True on a free-plan private repo returns HTTP 422
        ("Draft pull requests are not supported for this repository")
        and silently kills PR creation.
        """
        try:
            url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"
            payload = {
                "title": title,
                "body": body,
                "head": branch,
                "base": base_branch,
                # draft: True  ← REMOVED: breaks free private repos (HTTP 422)
            }
            logger.info(
                f"[GitHubTool] Creating PR: '{branch}' → '{base_branch}' "
                f"in {owner}/{repo}"
            )
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.post(url, json=payload)

            if r.status_code in (200, 201):
                pr_url = r.json().get("html_url", "")
                logger.info(f"[GitHubTool] ✅ PR created: {pr_url}")
                return pr_url
            else:
                logger.error(
                    f"[GitHubTool] ❌ PR creation failed: "
                    f"HTTP {r.status_code} — {r.text[:500]}"
                )
                return ""
        except Exception as e:
            logger.error(f"[GitHubTool] create_pull_request error: {e}")
            return ""

    # ── Comments ──────────────────────────────────────────────────────────────

    def post_workflow_comment(
        self,
        owner: str,
        repo: str,
        run_id: str,
        comment: str,
    ) -> str:
        """Post a comment on the commit associated with a workflow run."""
        try:
            run_info = self.get_run_info(owner, repo, run_id)
            sha = run_info.get("head_sha", "")
            if not sha:
                logger.warning(f"[GitHubTool] Cannot post comment: no head_sha for run {run_id}")
                return ""

            url = f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}/comments"
            with httpx.Client(headers=self.headers, timeout=15) as client:
                r = client.post(url, json={"body": comment})

            return r.json().get("html_url", "") if r.status_code in (200, 201) else ""
        except Exception as e:
            logger.error(f"[GitHubTool] post_workflow_comment error: {e}")
            return ""