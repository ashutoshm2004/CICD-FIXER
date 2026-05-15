import os
import shutil
import logging
from git import Repo

from config import settings

logger = logging.getLogger(__name__)


class RepoManager:
    def __init__(self):
        self.workspace_root = (
            settings.workspace_dir
        )

        os.makedirs(
            self.workspace_root,
            exist_ok=True,
        )

    def clone_repository(
        self,
        repo_url: str,
        workflow_id: str,
        branch: str = "main",
    ) -> str:
        """
        Clone repository into workspace.
        """

        workspace_path = os.path.join(
            self.workspace_root,
            workflow_id,
        )

        # Remove stale workspace
        if os.path.exists(
            workspace_path
        ):
            shutil.rmtree(
                workspace_path
            )

        logger.info(
            f"[RepoManager] "
            f"Cloning {repo_url}"
        )

        Repo.clone_from(
            repo_url,
            workspace_path,
            branch=branch,
        )

        logger.info(
            f"[RepoManager] "
            f"Cloned into "
            f"{workspace_path}"
        )

        return workspace_path

    def detect_project_type(
        self,
        repo_path: str,
    ) -> str:
        """
        Detect repo type.
        """

        files = os.listdir(repo_path)

        if (
            "requirements.txt"
            in files
            or any(
                f.endswith(".py")
                for f in files
            )
        ):
            return "python"

        if (
            "package.json"
            in files
        ):
            return "node"

        return "generic"