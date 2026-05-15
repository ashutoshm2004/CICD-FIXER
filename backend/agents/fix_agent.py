"""
Fix Generation Agent
====================
Responsibilities:
- Generate concrete file patches based on RCA classification
- Support multiple fix strategies per failure type
- Create unified diffs for all changes
- Use deterministic fixes where possible, LLM for complex cases

Supported fix types:
- missing_env_var: adds to .env.example
- dep_conflict: pins correct version in requirements.txt or package.json
- import_error: adds missing pip install to requirements.txt
- test_failure: generates test fix suggestions
- docker_build_failure: fixes Dockerfile
- ts_build_error: fixes TypeScript issues
- npm_dep_conflict: resolves package.json conflicts
"""

import json
import os
import re
import logging
from datetime import datetime
from agents.state import WorkflowState, ProposedFix
from config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Deterministic fix strategies (no LLM needed)
# ─────────────────────────────────────────────

def _fix_missing_env_var(state: WorkflowState) -> ProposedFix:
    """Add missing environment variable to .env.example."""
    classification = state["parsed_failure"]
    error_msgs = classification.get("error_messages", [])

    # Extract variable name from errors
    var_names = []
    for msg in error_msgs:
        match = re.search(r"['\"]?([A-Z_][A-Z0-9_]{2,})['\"]?", msg)
        if match:
            var_names.append(match.group(1))

    if not var_names:
        var_names = ["REQUIRED_ENV_VAR"]

    patches = []
    for var in set(var_names):
        patches.append({
            "file": ".env.example",
            "action": "append",
            "content": f"\n# Required: {var}\n{var}=\n",
            "explanation": f"Add missing required environment variable {var}",
        })

    return {
        "strategy": f"Add missing environment variable(s): {', '.join(set(var_names))}",
        "patches": patches,
        "commands_to_run": [],
        "explanation": f"The CI pipeline failed because {', '.join(set(var_names))} environment variable(s) were not set. Added to .env.example for documentation.",
    }


def _fix_dep_conflict(state: WorkflowState) -> ProposedFix:
    """Pin dependency versions to resolve conflicts."""
    classification = state["parsed_failure"]
    logs = state.get("raw_logs", "")
    language = classification.get("language", "python")

    if language == "python":
        # Extract conflicting package from logs
        match = re.search(r"Cannot install (.+?) and (.+?) because", logs)
        if match:
            pkg1, pkg2 = match.group(1), match.group(2)
            explanation = f"Pin conflicting packages: {pkg1}, {pkg2}"
        else:
            match = re.search(r"requires (.+?), but you have (.+?) which is incompatible", logs)
            if match:
                explanation = f"Version conflict: {match.group(1)} incompatible with {match.group(2)}"
            else:
                explanation = "Pin dependency versions to resolve conflict"

        return {
            "strategy": "Pin Python dependency versions in requirements.txt",
            "patches": [{
                "file": "requirements.txt",
                "action": "review_and_pin",
                "explanation": explanation,
                "suggestion": "Run 'pip-compile requirements.in' or manually pin conflicting packages",
            }],
            "commands_to_run": ["pip install pip-tools", "pip-compile --output-file requirements.txt requirements.in"],
            "explanation": explanation,
        }
    else:
        return {
            "strategy": "Resolve npm peer dependency conflict",
            "patches": [{
                "file": "package.json",
                "action": "add_resolution",
                "explanation": "Add resolutions field to package.json to force compatible version",
            }],
            "commands_to_run": ["npm install --legacy-peer-deps"],
            "explanation": "npm peer dependency conflict detected. Use --legacy-peer-deps or add resolutions.",
        }


def _fix_import_error(state: WorkflowState) -> ProposedFix:
    """Add missing Python module to requirements.txt."""
    classification = state["parsed_failure"]
    error_msgs = classification.get("error_messages", [])

    # Extract module name
    module_name = None
    for msg in error_msgs:
        m = re.search(r"No module named '([\w.]+)'", msg)
        if m:
            module_name = m.group(1).split(".")[0]
            break

    if not module_name:
        module_name = "missing_module"

    return {
        "strategy": f"Add '{module_name}' to requirements.txt",
        "patches": [{
            "file": "requirements.txt",
            "action": "append",
            "content": f"\n{module_name}\n",
            "explanation": f"Package '{module_name}' is imported but not in requirements.txt",
        }],
        "commands_to_run": [f"pip install {module_name}"],
        "explanation": f"Python module '{module_name}' is used in the codebase but missing from requirements.txt.",
    }


def _fix_docker_build_failure(state: WorkflowState) -> ProposedFix:
    """Fix common Dockerfile issues."""
    logs = state.get("raw_logs", "")

    # Detect common Docker failure patterns
    if "COPY failed: file not found" in logs:
        match = re.search(r"COPY failed: file not found in BUILD context.*?: ([\w./]+)", logs)
        missing_file = match.group(1) if match else "missing_file"
        return {
            "strategy": f"Fix COPY instruction — missing file: {missing_file}",
            "patches": [{
                "file": "Dockerfile",
                "action": "review",
                "explanation": f"File '{missing_file}' referenced in COPY does not exist in build context. Ensure the file exists or update the COPY path.",
            }],
            "commands_to_run": ["docker build --no-cache ."],
            "explanation": f"Dockerfile references '{missing_file}' which doesn't exist.",
        }

    if "apt-get" in logs and ("Unable to locate package" in logs or "E:" in logs):
        match = re.search(r"Unable to locate package (\S+)", logs)
        pkg = match.group(1) if match else "unknown-package"
        return {
            "strategy": f"Fix apt-get package name: {pkg}",
            "patches": [{
                "file": "Dockerfile",
                "action": "fix_apt_package",
                "explanation": f"Package '{pkg}' not found. Run 'apt-cache search' to find correct name or add 'apt-get update &&' before install.",
            }],
            "commands_to_run": [],
            "explanation": f"apt-get cannot find package '{pkg}'.",
        }

    return {
        "strategy": "Review Dockerfile for build errors",
        "patches": [{
            "file": "Dockerfile",
            "action": "review",
            "explanation": "Docker build failed. Check RUN steps and COPY paths.",
        }],
        "commands_to_run": ["docker build --progress=plain --no-cache ."],
        "explanation": "Docker build failure detected. Manual review of Dockerfile required.",
    }


def _fix_ts_build_error(state: WorkflowState) -> ProposedFix:
    """Fix TypeScript build errors via LLM."""
    classification = state["parsed_failure"]
    logs = state.get("raw_logs", "")
    error_msgs = classification.get("error_messages", [])

    # Extract TS error codes
    ts_errors = re.findall(r"error (TS\d+): (.*)", logs)

    if ts_errors:
        return {
            "strategy": f"Fix TypeScript errors: {', '.join([e[0] for e in ts_errors[:3]])}",
            "patches": [{
                "file": "tsconfig.json",
                "action": "review",
                "explanation": f"TypeScript errors detected: {'; '.join([f'{e[0]}: {e[1][:60]}' for e in ts_errors[:3]])}",
            }],
            "commands_to_run": ["npx tsc --noEmit"],
            "explanation": f"TypeScript compilation failed with {len(ts_errors)} error(s). Review type annotations.",
        }

    return {
        "strategy": "Fix TypeScript compilation errors",
        "patches": [],
        "commands_to_run": ["npx tsc --noEmit"],
        "explanation": "TypeScript build error. Run 'npx tsc --noEmit' locally for details.",
    }


def _fix_test_failure(state: WorkflowState) -> ProposedFix:
    """Analyze and suggest fix for failing tests."""
    logs = state.get("raw_logs", "")

    # Extract failing test names
    failing_tests = re.findall(r"FAILED ([\w/]+\.py::[\w]+)", logs)
    assertion_errors = re.findall(r"AssertionError: (.*)", logs)

    return {
        "strategy": f"Fix {len(failing_tests)} failing test(s)",
        "patches": [{
            "file": test,
            "action": "review",
            "explanation": f"Test {test} is failing. Check assertions match current behavior.",
        } for test in failing_tests[:5]],
        "commands_to_run": ["python -m pytest -v --tb=short"],
        "explanation": f"{len(failing_tests)} test(s) failing. Assertion errors: {'; '.join(assertion_errors[:3])}",
    }


# Map failure types to fix strategies
FIX_STRATEGIES = {
    "missing_env_var": _fix_missing_env_var,
    "dep_conflict": _fix_dep_conflict,
    "import_error": _fix_import_error,
    "docker_build_failure": _fix_docker_build_failure,
    "ts_build_error": _fix_ts_build_error,
    "npm_dep_conflict": _fix_dep_conflict,
    "test_failure": _fix_test_failure,
}


def _llm_generate_fix(state: WorkflowState) -> ProposedFix:
    """
    Use Gemini Flash for unknown/complex failure types.
    """
    try:
        import google.generativeai as genai
        if not settings.gemini_api_key:
            raise ValueError("No Gemini API key")

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        classification = state.get("parsed_failure", {})
        logs = state.get("raw_logs", "")[-3000:]

        prompt = f"""You are a senior DevOps engineer. Analyze this CI/CD failure and generate a concrete fix.

FAILURE TYPE: {classification.get('failure_type', 'unknown')}
LANGUAGE: {classification.get('language', 'generic')}
ERROR MESSAGES: {json.dumps(classification.get('error_messages', []))}

LOG EXCERPT:
{logs}

Respond ONLY with a valid JSON object (no markdown) with this structure:
{{
  "strategy": "One sentence fix strategy",
  "patches": [
    {{
      "file": "path/to/file",
      "action": "append|replace|create",
      "content": "exact content to add/replace",
      "explanation": "why this fixes the issue"
    }}
  ],
  "commands_to_run": ["command1", "command2"],
  "explanation": "Full explanation of the fix"
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())

    except Exception as e:
        logger.warning(f"[FixAgent] LLM fix generation failed: {e}")
        return {
            "strategy": "Manual review required",
            "patches": [],
            "commands_to_run": [],
            "explanation": f"Automated fix generation failed: {str(e)}. Manual investigation required.",
        }


def fix_agent(state: WorkflowState) -> WorkflowState:
    """Fix generation agent node for LangGraph."""
    logger.info(f"[FixAgent] Starting for workflow {state['workflow_id']}")
    new_state = {**state, "current_agent": "fix_generation"}

    classification = state.get("parsed_failure")
    if not classification:
        new_state["error"] = "No RCA classification available"
        new_state["final_status"] = "failed"
        return new_state

    try:
        failure_type = classification.get("failure_type", "unknown")
        retry_count = state.get("retry_count", 0)

        # Select fix strategy
        if failure_type in FIX_STRATEGIES:
            logger.info(f"[FixAgent] Using deterministic strategy for: {failure_type}")
            fix = FIX_STRATEGIES[failure_type](state)
        else:
            logger.info(f"[FixAgent] Unknown failure type '{failure_type}', using LLM")
            fix = _llm_generate_fix(state)

        # On retry, add context about what didn't work
        if retry_count > 0:
            fix["strategy"] = f"[Retry {retry_count}] " + fix["strategy"]
            fix["explanation"] = f"Previous fix attempt failed. {fix['explanation']}"

        new_state["proposed_fix"] = fix

        # Apply file patches to workspace
        workspace = state.get("workspace_path", "")
        if workspace and fix.get("patches"):
            _apply_patches(workspace, fix["patches"])

        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "fix_generation",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": fix["strategy"],
            "data": {"patches_count": len(fix.get("patches", [])), "commands": fix.get("commands_to_run", [])},
        }]

        logger.info(f"[FixAgent] Fix generated: {fix['strategy']}")
        return new_state

    except Exception as e:
        logger.error(f"[FixAgent] Failed: {e}")
        new_state["error"] = f"Fix agent failed: {str(e)}"
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "fix_generation",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "failed",
            "message": str(e),
        }]
        return new_state


def _apply_patches(workspace: str, patches: list) -> None:
    """Apply file patches to the local workspace directory."""
    for patch in patches:
        file_path = os.path.join(workspace, patch.get("file", ""))
        action = patch.get("action", "review")
        content = patch.get("content", "")

        try:
            if action == "append" and content:
                with open(file_path, "a") as f:
                    f.write(content)
                logger.info(f"[FixAgent] Appended to {file_path}")

            elif action == "create" and content:
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                with open(file_path, "w") as f:
                    f.write(content)
                logger.info(f"[FixAgent] Created {file_path}")

            elif action == "replace" and content:
                with open(file_path, "w") as f:
                    f.write(content)
                logger.info(f"[FixAgent] Replaced {file_path}")

            # "review" and other actions are no-ops (advisory only)

        except Exception as e:
            logger.warning(f"[FixAgent] Could not apply patch to {file_path}: {e}")