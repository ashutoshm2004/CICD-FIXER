import os
import json
import subprocess
import logging

logger = logging.getLogger(__name__)


class ExecutionEngine:
    """
    Generic execution engine.
    Supports:
    - Python
    - Node
    - Next.js
    - Docker
    """

    def detect_project_type(
        self,
        workspace: str,
    ) -> str:
        files = os.listdir(
            workspace
        )

        # Python
        if (
            "requirements.txt"
            in files
            or any(
                f.endswith(".py")
                for f in files
            )
        ):
            return "python"

        # Node / Next
        if "package.json" in files:
            try:
                with open(
                    os.path.join(
                        workspace,
                        "package.json",
                    ),
                    "r",
                ) as f:
                    package = json.load(
                        f
                    )

                deps = {
                    **package.get(
                        "dependencies",
                        {},
                    ),
                    **package.get(
                        "devDependencies",
                        {},
                    ),
                }

                if (
                    "next"
                    in deps
                ):
                    return "nextjs"

                return "node"

            except Exception:
                return "node"

        # Docker
        if (
            "Dockerfile"
            in files
        ):
            return "docker"

        return "generic"

    def _run_command(
        self,
        command: list[str],
        cwd: str,
        timeout: int = 120,
    ):
        try:
            result = (
                subprocess.run(
                    command,
                    cwd=cwd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
            )

            return {
                "success":
                    result.returncode == 0,
                "stdout":
                    result.stdout,
                "stderr":
                    result.stderr,
                "returncode":
                    result.returncode,
            }

        except Exception as e:
            return {
                "success":
                    False,
                "stdout": "",
                "stderr":
                    str(e),
                "returncode":
                    -1,
            }

    def run_project(
        self,
        workspace: str,
    ):
        project_type = (
            self.detect_project_type(
                workspace
            )
        )

        logger.info(
            f"[ExecutionEngine] "
            f"Detected "
            f"{project_type}"
        )

        # ───── PYTHON ─────
        if (
            project_type
            == "python"
        ):
            py_files = [
                f
                for f in os.listdir(
                    workspace
                )
                if f.endswith(
                    ".py"
                )
            ]

            entry_file = (
                "main.py"
                if "main.py"
                in py_files
                else py_files[0]
                if py_files
                else None
            )

            if not entry_file:
                return {
                    "success":
                        False,
                    "stderr":
                        "No Python "
                        "entry file",
                    "project_type":
                        "python",
                }

            result = (
                self._run_command(
                    [
                        "python",
                        entry_file,
                    ],
                    workspace,
                )
            )

            result[
                "entry_file"
            ] = entry_file

            result[
                "project_type"
            ] = "python"

            return result

        # ───── NODE ─────
        elif (
            project_type
            == "node"
        ):
            self._run_command(
                ["npm", "install"],
                workspace,
            )

            return {
                **self._run_command(
                    [
                        "npm",
                        "run",
                        "build",
                    ],
                    workspace,
                ),
                "project_type":
                    "node",
            }

        # ───── NEXTJS ─────
        elif (
            project_type
            == "nextjs"
        ):
            self._run_command(
                ["npm", "install"],
                workspace,
            )

            return {
                **self._run_command(
                    [
                        "npm",
                        "run",
                        "build",
                    ],
                    workspace,
                ),
                "project_type":
                    "nextjs",
            }

        # ───── DOCKER ─────
        elif (
            project_type
            == "docker"
        ):
            return {
                **self._run_command(
                    [
                        "docker",
                        "build",
                        ".",
                    ],
                    workspace,
                ),
                "project_type":
                    "docker",
            }

        return {
            "success":
                False,
            "stderr":
                "Unsupported "
                "project type",
            "project_type":
                "generic",
        }