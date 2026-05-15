"""
Shell Executor Tool
===================
Safe, sandboxed execution of shell commands for validation.
- Enforces allowlist of permitted commands
- Enforces timeout
- Captures and returns structured output
"""

import subprocess
import shlex
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Only these base commands are permitted for security
ALLOWED_COMMANDS = {
    "python", "python3", "pip", "pip3",
    "node", "npm", "npx",
    "docker",
    "pytest",
    "flake8", "black", "mypy",
    "eslint", "tsc",
    "cat", "ls", "echo", "grep", "find",
    "git",
    "sh", "bash",
}


class ShellExecutor:
    def __init__(self, workspace: str, timeout: int = 60):
        self.workspace = workspace
        self.timeout = timeout

    def run(self, command: str, check_allowlist: bool = True) -> dict:
        """
        Execute a shell command in the workspace directory.
        Returns: {command, returncode, stdout, stderr, timed_out}
        """
        # Extract base command for allowlist check
        try:
            parts = shlex.split(command)
        except ValueError:
            parts = command.split()

        base_cmd = parts[0].lstrip("./") if parts else ""

        if check_allowlist and base_cmd not in ALLOWED_COMMANDS:
            logger.warning(f"[ShellExecutor] Blocked disallowed command: {base_cmd}")
            return {
                "command": command,
                "returncode": -1,
                "stdout": "",
                "stderr": f"Command '{base_cmd}' is not in the allowed command list",
                "timed_out": False,
            }

        logger.info(f"[ShellExecutor] Running: {command[:80]}")

        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=self.workspace,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                env={
                    "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin",
                    "HOME": "/root",
                    "PYTHONPATH": self.workspace,
                }
            )
            return {
                "command": command,
                "returncode": result.returncode,
                "stdout": result.stdout[-3000:] if result.stdout else "",
                "stderr": result.stderr[-1500:] if result.stderr else "",
                "timed_out": False,
            }
        except subprocess.TimeoutExpired:
            logger.warning(f"[ShellExecutor] Command timed out: {command[:60]}")
            return {
                "command": command,
                "returncode": -1,
                "stdout": "",
                "stderr": f"Timed out after {self.timeout}s",
                "timed_out": True,
            }
        except Exception as e:
            logger.error(f"[ShellExecutor] Error running command: {e}")
            return {
                "command": command,
                "returncode": -1,
                "stdout": "",
                "stderr": str(e),
                "timed_out": False,
            }

    def run_batch(self, commands: list, stop_on_failure: bool = False) -> list:
        """Run a list of commands, returning all results."""
        results = []
        for cmd in commands:
            result = self.run(cmd)
            results.append(result)
            if stop_on_failure and result["returncode"] != 0:
                logger.info(f"[ShellExecutor] Stopping batch on failure: {cmd[:60]}")
                break
        return results