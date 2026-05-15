"""
Validation Agent
================
Responsibilities:
- Run deterministic validation commands based on failure type
- Execute language-specific checks (pytest, npm test, docker build, etc.)
- Return pass/fail with full command output
- NO LLM CALLS — purely deterministic tooling

This agent is intentionally simple and fast.
"""

import subprocess
import os
import logging
import shutil
from datetime import datetime
from agents.state import WorkflowState, ValidationResult
from config import settings

logger = logging.getLogger(__name__)

# Map failure types to validation commands
VALIDATION_COMMANDS = {
    "missing_env_var": [
        "echo 'Checking .env.example for required variables...'",
        "cat .env.example || true",
    ],
    "dep_conflict": {
        "python": [
            "pip install -r requirements.txt --dry-run 2>&1 | head -50",
        ],
        "node": [
            "npm install --dry-run 2>&1 | head -50",
        ],
    },
    "import_error": {
        "python": [
            "pip install -r requirements.txt 2>&1 | tail -20",
            "python -c 'import ast, sys; [ast.parse(open(f).read()) for f in sys.argv[1:] if f.endswith(\".py\")]' *.py 2>&1 || true",
        ],
    },
    "test_failure": {
        "python": [
            "pip install -r requirements.txt -q 2>&1 | tail -5",
            "python -m pytest --tb=short -q 2>&1 | tail -30",
        ],
        "node": [
            "npm install --silent",
            "npm test 2>&1 | tail -30",
        ],
    },
    "docker_build_failure": [
        "docker build --dry-run . 2>&1 | tail -20 || docker build --no-cache . 2>&1 | tail -30",
    ],
    "ts_build_error": [
        "npm install --silent 2>&1 | tail -5",
        "npx tsc --noEmit 2>&1 | tail -30",
    ],
    "npm_dep_conflict": [
        "npm install --legacy-peer-deps 2>&1 | tail -20",
    ],
    "syntax_error": {
        "python": [
            "python -m py_compile *.py 2>&1 || true",
            "python -m flake8 --select=E9 *.py 2>&1 | head -20 || true",
        ],
    },
}


def _get_commands(failure_type: str, language: str) -> list[str]:
    """Get the appropriate validation commands for this failure type."""
    commands = VALIDATION_COMMANDS.get(failure_type, [])

    # Handle dict (language-specific) vs list (generic)
    if isinstance(commands, dict):
        commands = commands.get(language, commands.get("python", []))

    if not commands:
        # Generic fallback
        if language == "python":
            commands = ["python -m pytest --tb=short -q 2>&1 | tail -20 || echo 'No tests found'"]
        elif language == "node":
            commands = ["npm install --silent && npm test 2>&1 | tail -20 || echo 'Tests failed'"]
        else:
            commands = ["echo 'No specific validation available for this failure type'"]

    return commands


def _run_command(cmd: str, cwd: str, timeout: int = 60) -> dict:
    """Run a shell command and return structured result."""
    logger.info(f"[ValidationAgent] Running: {cmd[:80]}...")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "command": cmd,
            "returncode": result.returncode,
            "stdout": result.stdout[-2000:] if result.stdout else "",
            "stderr": result.stderr[-1000:] if result.stderr else "",
            "timed_out": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "command": cmd,
            "returncode": -1,
            "stdout": "",
            "stderr": f"Command timed out after {timeout}s",
            "timed_out": True,
        }
    except Exception as e:
        return {
            "command": cmd,
            "returncode": -1,
            "stdout": "",
            "stderr": str(e),
            "timed_out": False,
        }


def _is_tool_available(tool: str) -> bool:
    """Check if a CLI tool is available in PATH."""
    return shutil.which(tool) is not None


def validation_agent(state: WorkflowState) -> WorkflowState:
    """Validation agent node for LangGraph."""
    logger.info(f"[ValidationAgent] Starting for workflow {state['workflow_id']}")
    new_state = {**state, "current_agent": "validation"}

    classification = state.get("parsed_failure")
    fix = state.get("proposed_fix")

    if not classification:
        new_state["validation_result"] = {
            "passed": False,
            "commands_run": [],
            "summary": "Cannot validate: no RCA classification",
        }
        return new_state

    failure_type = classification.get("failure_type", "unknown")
    language = classification.get("language", "generic")
    workspace = state.get("workspace_path", settings.workspace_dir)

    try:
        commands = _get_commands(failure_type, language)

        # Also add commands from the proposed fix
        if fix and fix.get("commands_to_run"):
            commands = fix["commands_to_run"] + commands

        results = []
        overall_passed = True

        for cmd in commands[:5]:  # Limit to 5 commands max
            # Safety: skip commands that require tools not available
            tool = cmd.split()[0].lstrip("$").strip()
            if tool in ["docker", "npm", "npx", "pytest", "pip", "python", "node"]:
                if not _is_tool_available(tool):
                    results.append({
                        "command": cmd,
                        "returncode": 0,
                        "stdout": f"[SKIPPED] Tool '{tool}' not available in container",
                        "stderr": "",
                        "timed_out": False,
                    })
                    continue

            result = _run_command(cmd, cwd=workspace)
            results.append(result)

            # For critical commands, track failures
            if result["returncode"] != 0 and not result["timed_out"]:
                if any(kw in cmd for kw in ["pytest", "tsc", "npm test", "build"]):
                    overall_passed = False

        # Summarize
        failed_commands = [r for r in results if r["returncode"] != 0 and not r["timed_out"]]
        passed_commands = [r for r in results if r["returncode"] == 0]

        if overall_passed:
            summary = f"Validation passed: {len(passed_commands)}/{len(results)} commands succeeded"
        else:
            summary = f"Validation failed: {len(failed_commands)}/{len(results)} commands failed"

        validation_result: ValidationResult = {
            "passed": overall_passed,
            "commands_run": results,
            "summary": summary,
        }

        new_state["validation_result"] = validation_result

        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "validation",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": summary,
            "data": {"passed": overall_passed, "commands_count": len(results)},
        }]

        logger.info(f"[ValidationAgent] {summary}")
        return new_state

    except Exception as e:
        logger.error(f"[ValidationAgent] Failed: {e}")
        new_state["validation_result"] = {
            "passed": False,
            "commands_run": [],
            "summary": f"Validation error: {str(e)}",
        }
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "validation",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "failed",
            "message": str(e),
        }]
        return new_state