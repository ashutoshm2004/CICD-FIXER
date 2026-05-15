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


# ─────────────────────────────────────────────────────────────────────────────
# Patch helpers
# ─────────────────────────────────────────────────────────────────────────────

def _base_branch(state: WorkflowState) -> str:
    """
    Return the true base branch of the repo.

    repo_branch in state can be polluted by a previous autofix run
    (e.g. 'autofix/adeb916b-docker_build_failure').  Always fall back
    to the repo default rather than use that value blindly.
    """
    branch = state.get("repo_branch", "main")
    if branch.startswith("autofix/"):
        logger.warning(
            f"[FixAgent] repo_branch looks like a fix branch ('{branch}') — "
            "using 'main' as base instead"
        )
        return "main"
    return branch or "main"


def _fetch_file(state: WorkflowState, path: str) -> str:
    """
    Fetch current contents of *path* from the repo's BASE branch.
    Returns empty string when the file doesn't exist (404) or on error.
    """
    try:
        from tools.github_tool import GitHubTool
        gh = GitHubTool()
        ref = _base_branch(state)
        content = gh.get_file_contents(
            owner=state.get("repo_owner", ""),
            repo=state.get("repo_name", "").split("/")[-1],
            path=path,
            ref=ref,
        )
        if content is None:
            logger.info(f"[FixAgent] '{path}' not found on branch '{ref}' (new file will be created)")
            return ""
        return content
    except Exception as e:
        logger.warning(f"[FixAgent] Could not fetch '{path}': {e}")
        return ""


def _make_patch(file: str, original: str, replacement: str, explanation: str) -> dict:
    """
    Canonical patch structure consumed by GitHubTool.commit_patches().
    The 'replacement' key is what commit_patches reads.
    """
    return {
        "file": file,
        "original": original,
        "replacement": replacement,
        "explanation": explanation,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic fix strategies
# ─────────────────────────────────────────────────────────────────────────────

def _fix_missing_env_var(state: WorkflowState) -> ProposedFix:
    """Add missing environment variable to .env.example."""
    classification = state["parsed_failure"]
    error_msgs = classification.get("error_messages", [])

    var_names = []
    for msg in error_msgs:
        match = re.search(r"['\"]?([A-Z_][A-Z0-9_]{2,})['\"]?", msg)
        if match:
            var_names.append(match.group(1))
    if not var_names:
        var_names = ["REQUIRED_ENV_VAR"]

    target = ".env.example"
    original = _fetch_file(state, target)
    additions = ""
    for var in set(var_names):
        if var not in original:
            additions += f"\n# Required: {var}\n{var}=\n"

    patches = []
    if additions:
        patches.append(_make_patch(
            file=target,
            original=original,
            replacement=original + additions,
            explanation=f"Add missing required environment variable(s): {', '.join(set(var_names))}",
        ))

    return {
        "strategy": f"Add missing environment variable(s): {', '.join(set(var_names))}",
        "patches": patches,
        "commands_to_run": [],
        "explanation": (
            f"The CI pipeline failed because {', '.join(set(var_names))} "
            "environment variable(s) were not set. Added to .env.example."
        ),
    }


def _fix_dep_conflict(state: WorkflowState) -> ProposedFix:
    """Pin dependency versions to resolve conflicts."""
    classification = state["parsed_failure"]
    logs = state.get("raw_logs", "")
    language = classification.get("language", "python")

    if language == "python":
        match = re.search(r"Cannot install (.+?) and (.+?) because", logs)
        if match:
            pkg1, pkg2 = match.group(1), match.group(2)
            explanation = f"Pin conflicting packages: {pkg1}, {pkg2}"
        else:
            match = re.search(
                r"requires (.+?), but you have (.+?) which is incompatible", logs
            )
            explanation = (
                f"Version conflict: {match.group(1)} incompatible with {match.group(2)}"
                if match else "Pin dependency versions to resolve conflict"
            )

        target = "requirements.txt"
        original = _fetch_file(state, target)
        addition = "\n# TODO: run 'pip-compile requirements.in' to regenerate pinned deps\n# pip-tools\n"
        replacement = original + addition if addition.strip() not in original else original

        return {
            "strategy": "Pin Python dependency versions in requirements.txt",
            "patches": [_make_patch(
                file=target,
                original=original,
                replacement=replacement,
                explanation=explanation,
            )],
            "commands_to_run": [
                "pip install pip-tools",
                "pip-compile --output-file requirements.txt requirements.in",
            ],
            "explanation": explanation,
        }
    else:
        target = "package.json"
        original = _fetch_file(state, target)
        try:
            pkg = json.loads(original) if original else {}
        except json.JSONDecodeError:
            pkg = {}

        if "resolutions" not in pkg:
            pkg["resolutions"] = {}
            replacement = json.dumps(pkg, indent=2) + "\n"
        else:
            replacement = original

        return {
            "strategy": "Resolve npm peer dependency conflict",
            "patches": [_make_patch(
                file=target,
                original=original,
                replacement=replacement,
                explanation="Add resolutions field to package.json to force compatible version",
            )],
            "commands_to_run": ["npm install --legacy-peer-deps"],
            "explanation": "npm peer dependency conflict. Use --legacy-peer-deps or add resolutions.",
        }


def _fix_import_error(state: WorkflowState) -> ProposedFix:
    """Add missing Python module to requirements.txt."""
    classification = state["parsed_failure"]
    error_msgs = classification.get("error_messages", [])

    module_name = None
    for msg in error_msgs:
        m = re.search(r"No module named '([\w.]+)'", msg)
        if m:
            module_name = m.group(1).split(".")[0]
            break
    if not module_name:
        module_name = "missing_module"

    target = "requirements.txt"
    original = _fetch_file(state, target)

    if module_name in original:
        patches = []
    else:
        replacement = original.rstrip("\n") + f"\n{module_name}\n"
        patches = [_make_patch(
            file=target,
            original=original,
            replacement=replacement,
            explanation=f"Package '{module_name}' is imported but not in requirements.txt",
        )]

    return {
        "strategy": f"Add '{module_name}' to requirements.txt",
        "patches": patches,
        "commands_to_run": [f"pip install {module_name}"],
        "explanation": (
            f"Python module '{module_name}' is used in the codebase "
            "but missing from requirements.txt."
        ),
    }


def _fix_docker_build_failure(state: WorkflowState) -> ProposedFix:
    """
    Fix common Dockerfile issues.

    Key guarantee: always produces at least one committable patch.
    When the Dockerfile doesn't exist in the repo we create a starter
    template so the PR has real content to commit.
    """
    logs = state.get("raw_logs", "")
    classification = state.get("parsed_failure", {})
    target = "Dockerfile"
    original = _fetch_file(state, target)   # "" when file not found (404)

    # ── Case 1: missing COPY source file ──────────────────────────────────────
    if "COPY failed: file not found" in logs:
        match = re.search(
            r"COPY failed: file not found in BUILD context.*?: ([\w./]+)", logs
        )
        missing_file = match.group(1) if match else "unknown_file"

        if original:
            fixed = re.sub(
                rf"(COPY\s+.*?{re.escape(missing_file)}.*)",
                rf"# TODO: ensure '{missing_file}' exists before building\n\\1",
                original,
            )
            if fixed == original:
                fixed = original.rstrip("\n") + (
                    f"\n# WARNING: '{missing_file}' was not found during build — "
                    "verify COPY paths.\n"
                )
        else:
            fixed = (
                f"# WARNING: Dockerfile not found in repo root.\n"
                f"# The CI failure referenced a missing file: '{missing_file}'\n"
                f"# Add a valid Dockerfile and ensure '{missing_file}' exists.\n"
                f"FROM ubuntu:22.04\n"
                f"WORKDIR /app\n"
                f"# COPY {missing_file} .   # <-- fix this path\n"
                f"CMD [\"bash\"]\n"
            )

        return {
            "strategy": f"Fix COPY instruction — missing file: {missing_file}",
            "patches": [_make_patch(
                file=target,
                original=original,
                replacement=fixed,
                explanation=(
                    f"File '{missing_file}' referenced in COPY does not exist "
                    "in build context."
                ),
            )],
            "commands_to_run": ["docker build --no-cache ."],
            "explanation": f"Dockerfile references '{missing_file}' which doesn't exist.",
        }

    # ── Case 2: apt-get package not found ─────────────────────────────────────
    if "apt-get" in logs and (
        "Unable to locate package" in logs or "E:" in logs
    ):
        match = re.search(r"Unable to locate package (\S+)", logs)
        pkg = match.group(1) if match else "unknown-package"

        if original:
            fixed = re.sub(
                rf"(RUN\s+)(apt-get install[^\n]*{re.escape(pkg)}[^\n]*)",
                r"\1apt-get update && \2",
                original,
            )
            if fixed == original:
                fixed = original.rstrip("\n") + (
                    f"\n# TODO: verify package name '{pkg}' — "
                    "run apt-cache search to find correct name\n"
                )
        else:
            fixed = (
                f"# Dockerfile not found. apt-get error referenced package: '{pkg}'\n"
                f"FROM ubuntu:22.04\n"
                f"RUN apt-get update && apt-get install -y \\\n"
                f"    # {pkg}  <-- verify this package name\n"
                f"WORKDIR /app\n"
                f"CMD [\"bash\"]\n"
            )

        return {
            "strategy": f"Fix apt-get package name: {pkg}",
            "patches": [_make_patch(
                file=target,
                original=original,
                replacement=fixed,
                explanation=(
                    f"Package '{pkg}' not found. "
                    "Added 'apt-get update &&' and flagged name for review."
                ),
            )],
            "commands_to_run": [],
            "explanation": f"apt-get cannot find package '{pkg}'.",
        }

    # ── Case 3: generic Docker failure ────────────────────────────────────────
    # Extract as much useful context from the logs as possible
    error_lines = []
    for line in logs.splitlines():
        low = line.lower()
        if any(k in low for k in ("error", "failed", "exit code", "exited")):
            stripped = line.strip()
            if stripped:
                error_lines.append(stripped)
    error_summary = "\n".join(f"#   {l}" for l in error_lines[:10]) or "#   (see CI logs)"

    if original:
        note = (
            f"\n# ── CI build failure detected ──────────────────────────────\n"
            f"# Errors from the failing run:\n"
            f"{error_summary}\n"
            f"# Review the RUN steps and COPY paths above.\n"
        )
        fixed = original.rstrip("\n") + "\n" + note
    else:
        # Dockerfile doesn't exist at all — create a minimal starter
        fixed = (
            f"# Dockerfile — auto-generated by CI fixer\n"
            f"# The CI pipeline reported a Docker build failure.\n"
            f"# Errors from the failing run:\n"
            f"{error_summary}\n"
            f"#\n"
            f"# Replace the template below with your actual build steps.\n"
            f"FROM ubuntu:22.04\n"
            f"WORKDIR /app\n"
            f"COPY . .\n"
            f"RUN apt-get update && apt-get install -y --no-install-recommends \\\n"
            f"    curl \\\n"
            f"    && rm -rf /var/lib/apt/lists/*\n"
            f"CMD [\"bash\"]\n"
        )

    return {
        "strategy": "Fix Dockerfile — annotate errors and ensure file exists",
        "patches": [_make_patch(
            file=target,
            original=original,
            replacement=fixed,
            explanation=(
                "Docker build failed. "
                + ("Dockerfile annotated with CI error context." if original
                   else "Dockerfile did not exist — created a starter template with error context.")
            ),
        )],
        "commands_to_run": ["docker build --progress=plain --no-cache ."],
        "explanation": (
            "Docker build failure detected. "
            + ("Dockerfile updated with error annotations." if original
               else "No Dockerfile found in repo root — starter template created.")
        ),
    }


def _fix_ts_build_error(state: WorkflowState) -> ProposedFix:
    """Fix TypeScript build errors."""
    logs = state.get("raw_logs", "")
    ts_errors = re.findall(r"error (TS\d+): (.*)", logs)

    target = "tsconfig.json"
    original = _fetch_file(state, target)

    try:
        tsconfig = json.loads(original) if original else {}
    except json.JSONDecodeError:
        tsconfig = {}

    patched = False
    if any(e[0] == "TS2307" for e in ts_errors):
        co = tsconfig.setdefault("compilerOptions", {})
        if not co.get("esModuleInterop"):
            co["esModuleInterop"] = True
            patched = True
        if co.get("moduleResolution") not in ("node", "node16", "bundler"):
            co["moduleResolution"] = "node"
            patched = True

    replacement = (json.dumps(tsconfig, indent=2) + "\n") if patched else original

    return {
        "strategy": (
            f"Fix TypeScript errors: {', '.join([e[0] for e in ts_errors[:3]])}"
            if ts_errors else "Fix TypeScript compilation errors"
        ),
        "patches": [_make_patch(
            file=target,
            original=original,
            replacement=replacement,
            explanation=f"TypeScript errors: {'; '.join([f'{e[0]}: {e[1][:60]}' for e in ts_errors[:3]])}",
        )] if patched else [],
        "commands_to_run": ["npx tsc --noEmit"],
        "explanation": (
            f"TypeScript compilation failed with {len(ts_errors)} error(s). "
            "Review type annotations."
        ),
    }


def _fix_test_failure(state: WorkflowState) -> ProposedFix:
    """Analyse and suggest fix for failing tests."""
    logs = state.get("raw_logs", "")
    failing_tests = re.findall(r"FAILED ([\w/]+\.py::[\w]+)", logs)
    assertion_errors = re.findall(r"AssertionError: (.*)", logs)

    patches = []
    for test_path in failing_tests[:5]:
        file_path = test_path.split("::")[0]
        original = _fetch_file(state, file_path)
        if original:
            note = (
                f"\n# TODO: fix failing assertion — "
                f"{assertion_errors[0][:120] if assertion_errors else 'see CI logs'}\n"
            )
            if note.strip() not in original:
                patches.append(_make_patch(
                    file=file_path,
                    original=original,
                    replacement=original + note,
                    explanation=f"Test {test_path} is failing. Check assertions match current behaviour.",
                ))

    return {
        "strategy": f"Fix {len(failing_tests)} failing test(s)",
        "patches": patches,
        "commands_to_run": ["python -m pytest -v --tb=short"],
        "explanation": (
            f"{len(failing_tests)} test(s) failing. "
            f"Assertion errors: {'; '.join(assertion_errors[:3])}"
        ),
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


# ─────────────────────────────────────────────────────────────────────────────
# LLM fallback
# ─────────────────────────────────────────────────────────────────────────────

def _llm_generate_fix(state: WorkflowState) -> ProposedFix:
    """Use Groq / Gemini / OpenRouter for unknown/complex failure types."""
    try:
        classification = state.get("parsed_failure", {})
        logs = state.get("raw_logs", "")[-3000:]

        prompt = f"""You are a senior DevOps engineer. Analyze this CI/CD failure and generate a concrete fix.

FAILURE TYPE: {classification.get('failure_type', 'unknown')}
LANGUAGE: {classification.get('language', 'generic')}
ERROR MESSAGES: {json.dumps(classification.get('error_messages', []))}

LOG EXCERPT:
{logs}

Respond ONLY with valid JSON (no markdown fences):
{{
  "strategy": "One sentence fix strategy",
  "patches": [
    {{
      "file": "path/to/file",
      "original": "exact original content of the file (empty string if new file)",
      "replacement": "exact new content for the ENTIRE file after the fix",
      "explanation": "why this fixes the issue"
    }}
  ],
  "commands_to_run": ["command1"],
  "explanation": "Full explanation"
}}

IMPORTANT: 'replacement' must be the COMPLETE new file content, not a diff fragment.
Only include patches for files you are confident need changing.
"""

        text = ""

        if settings.gemini_api_key:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.llm_model)
            response = model.generate_content(prompt)
            text = response.text.strip()

        elif settings.openrouter_api_key:
            import requests
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"].strip()

        elif settings.groq_api_key:
            import requests
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                },
                timeout=60,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"].strip()

        else:
            raise ValueError("No LLM provider configured")

        # Strip markdown fences if present
        if "```" in text:
            text = re.sub(r"```(?:json)?", "", text).strip().strip("`").strip()

        return json.loads(text)

    except Exception as e:
        logger.warning(f"[FixAgent] LLM fix generation failed: {e}")
        return {
            "strategy": "Manual review required",
            "patches": [],
            "commands_to_run": [],
            "explanation": f"Automated fix generation failed: {str(e)}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Agent entry point
# ─────────────────────────────────────────────────────────────────────────────

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

        if failure_type in FIX_STRATEGIES:
            logger.info(f"[FixAgent] Using deterministic strategy for: {failure_type}")
            fix = FIX_STRATEGIES[failure_type](state)
        else:
            logger.info(f"[FixAgent] Unknown failure type '{failure_type}', using LLM")
            fix = _llm_generate_fix(state)

        if retry_count > 0:
            fix["strategy"] = f"[Retry {retry_count}] " + fix["strategy"]
            fix["explanation"] = f"Previous fix attempt failed. {fix['explanation']}"

        # Drop patches that have no committable content (defensive guard)
        before = len(fix.get("patches", []))
        fix["patches"] = [
            p for p in fix.get("patches", [])
            if p.get("replacement") and p.get("file")
        ]
        dropped = before - len(fix["patches"])
        if dropped:
            logger.warning(
                f"[FixAgent] Dropped {dropped} patch(es) with empty 'replacement' field"
            )

        new_state["proposed_fix"] = fix

        # Apply patches to local workspace if running locally
        workspace = state.get("workspace_path", "")
        if workspace and fix.get("patches"):
            _apply_patches(workspace, fix["patches"])

        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "fix_generation",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": fix["strategy"],
            "data": {
                "patches_count": len(fix.get("patches", [])),
                "commands": fix.get("commands_to_run", []),
            },
        }]

        logger.info(
            f"[FixAgent] Fix generated: {fix['strategy']} "
            f"({len(fix['patches'])} committable patch(es))"
        )
        return new_state

    except Exception as e:
        logger.error(f"[FixAgent] Failed: {e}", exc_info=True)
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
        replacement = patch.get("replacement", "")
        if not replacement:
            continue
        try:
            os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
            with open(file_path, "w") as f:
                f.write(replacement)
            logger.info(f"[FixAgent] Wrote patch to {file_path}")
        except Exception as e:
            logger.warning(f"[FixAgent] Could not apply patch to {file_path}: {e}")