"""
Root Cause Analysis (RCA) Agent
================================
Responsibilities:
- Analyze raw CI/CD failure logs
- Classify failure type with confidence score
- Identify affected files and error messages
- Use deterministic pattern matching first, LLM as fallback

Supported failure classes:
- Python: pip_mismatch, import_error, syntax_error, test_failure
- Node: npm_dep_conflict, ts_build_error, missing_package
- Docker: build_failure, dockerfile_error, port_conflict
- Environment: missing_env_var, malformed_config
"""

import json
import logging
import re
from datetime import datetime
from agents.state import WorkflowState, FailureClassification
from tools.log_parser import LogParser
from config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Deterministic pattern matching rules
# These run BEFORE any LLM call to minimize token usage
# ─────────────────────────────────────────────
PATTERNS = [
    {
        "type": "missing_env_var",
        "language": "generic",
        "patterns": [
            r"KeyError:\s*['\"](\w+)['\"]",
            r"environment variable[:\s]+['\"]?(\w+)['\"]?\s+(?:is\s+)?(?:not\s+set|missing|required)",
            r"(\w+)\s+is not set",
            r"Missing required environment variable[:\s]+(\w+)",
        ],
        "confidence": 0.92,
    },
    {
        "type": "dep_conflict",
        "language": "python",
        "patterns": [
            r"ERROR: Cannot install.*because these package versions have conflicting dependencies",
            r"ResolutionImpossible",
            r"pip.*ERROR.*requirement.*conflict",
            r"incompatible with.*requires.*but you have",
        ],
        "confidence": 0.95,
    },
    {
        "type": "import_error",
        "language": "python",
        "patterns": [
            r"ModuleNotFoundError: No module named '([\w.]+)'",
            r"ImportError: cannot import name '(\w+)' from '([\w.]+)'",
            r"ImportError: No module named",
        ],
        "confidence": 0.97,
    },
    {
        "type": "test_failure",
        "language": "python",
        "patterns": [
            r"FAILED\s+[\w/]+\.py::\w+",
            r"AssertionError",
            r"pytest.*\d+ failed",
            r"E\s+AssertionError:",
        ],
        "confidence": 0.88,
    },
    {
        "type": "docker_build_failure",
        "language": "docker",
        "patterns": [
            r"failed to solve.*Dockerfile",
            r"ERROR \[.*\] RUN",
            r"docker build.*failed",
            r"failed to build.*image",
            r"COPY failed: file not found",
        ],
        "confidence": 0.93,
    },
    {
        "type": "ts_build_error",
        "language": "node",
        "patterns": [
            r"error TS\d+:",
            r"TypeScript.*error",
            r"Type '.*' is not assignable to type",
            r"Cannot find module.*or its corresponding type declarations",
            r"Property '.*' does not exist on type",
        ],
        "confidence": 0.96,
    },
    {
        "type": "npm_dep_conflict",
        "language": "node",
        "patterns": [
            r"npm ERR! peer dep missing",
            r"npm ERR! ERESOLVE",
            r"Could not resolve dependency",
            r"npm ERR!.*requires a peer of",
        ],
        "confidence": 0.94,
    },
    {
        "type": "syntax_error",
        "language": "python",
        "patterns": [
            r"SyntaxError: (.*)",
            r"IndentationError: (.*)",
        ],
        "confidence": 0.99,
    },
]


def _match_patterns(logs: str) -> tuple[str | None, str, float, list[str]]:
    """Return (failure_type, language, confidence, matched_messages)."""
    matched_messages = []
    for rule in PATTERNS:
        for pattern in rule["patterns"]:
            matches = re.findall(pattern, logs, re.IGNORECASE | re.MULTILINE)
            if matches:
                for m in matches[:3]:
                    if isinstance(m, tuple):
                        matched_messages.append(" ".join(m))
                    else:
                        matched_messages.append(str(m))
                return rule["type"], rule["language"], rule["confidence"], matched_messages
    return None, "generic", 0.0, []


def _extract_error_lines(logs: str, max_lines: int = 20) -> list[str]:
    """Extract the most relevant error lines from raw logs."""
    lines = logs.split("\n")
    error_lines = []
    keywords = ["error", "fail", "exception", "traceback", "err!", "cannot", "missing", "not found"]
    for line in lines:
        line_lower = line.lower()
        if any(kw in line_lower for kw in keywords):
            stripped = line.strip()
            if stripped and len(stripped) > 5:
                error_lines.append(stripped)
    return error_lines[:max_lines]


def _llm_classify(logs: str, partial_type: str) -> FailureClassification:
    """
    Use Gemini Flash to classify when deterministic matching is insufficient.
    Returns a FailureClassification dict.
    """
    try:
        import google.generativeai as genai

        if not settings.gemini_api_key:
            raise ValueError("No Gemini API key configured")

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        error_excerpt = "\n".join(_extract_error_lines(logs))

        prompt = f"""You are a DevOps expert analyzing a CI/CD pipeline failure.

Analyze this failure log excerpt and classify the root cause.

FAILURE LOG (key lines only):
{error_excerpt[:3000]}

Respond ONLY with a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "failure_type": "<one of: missing_env_var|dep_conflict|import_error|test_failure|docker_build_failure|ts_build_error|npm_dep_conflict|syntax_error|unknown>",
  "language": "<one of: python|node|docker|generic>",
  "affected_files": ["list of file paths mentioned"],
  "error_messages": ["key error messages extracted"],
  "confidence": 0.85,
  "reasoning": "Brief explanation of root cause"
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())

    except Exception as e:
        logger.warning(f"[RCAAgent] LLM classification failed: {e}, using heuristic fallback")
        return {
            "failure_type": partial_type or "unknown",
            "language": "generic",
            "affected_files": [],
            "error_messages": _extract_error_lines(logs, 5),
            "confidence": 0.40,
            "reasoning": "Classified by heuristic fallback due to LLM unavailability",
        }


def rca_agent(state: WorkflowState) -> WorkflowState:
    """RCA agent node for LangGraph."""
    logger.info(f"[RCAAgent] Starting for workflow {state['workflow_id']}")
    new_state = {**state, "current_agent": "rca"}

    logs = (
        state.get(
            "raw_logs",
            ""
        )
        or
        state.get(
            "execution_error",
            ""
        )
    )

    # Manual repo mode:
    # execution error not
    # available yet.
    if not logs:
        logger.info(
            "[RCAAgent] "
            "No logs yet. "
            "Skipping RCA "
            "for now."
        )

        new_state[
            "parsed_failure"
        ] = {
            "failure_type":
                "unknown",
            "language":
                "generic",
            "affected_files":
                [],
            "error_messages":
                [],
            "confidence":
                0.0,
            "reasoning":
                (
                    "Waiting for "
                    "execution error"
                ),
        }

        return new_state

    try:
        # Step 1: Try deterministic pattern matching
        failure_type, language, confidence, error_messages = _match_patterns(logs)

        if confidence >= 0.85:
            # High confidence deterministic match — skip LLM
            parser = LogParser()
            affected_files = parser.extract_file_paths(logs)

            classification: FailureClassification = {
                "failure_type": failure_type,
                "language": language,
                "affected_files": affected_files[:10],
                "error_messages": error_messages,
                "confidence": confidence,
                "reasoning": f"Deterministic pattern match for {failure_type} ({confidence*100:.0f}% confidence)",
            }
            logger.info(f"[RCAAgent] Deterministic match: {failure_type} @ {confidence}")
        else:
            # Low confidence — escalate to LLM
            logger.info("[RCAAgent] Low deterministic confidence, calling LLM")
            classification = _llm_classify(logs, failure_type)

        new_state["parsed_failure"] = classification

        # Persist confidence to top-level for DB
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "rca",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": f"Root cause identified: {classification['failure_type']} ({classification['confidence']*100:.0f}% confidence)",
            "data": classification,
        }]

        logger.info(f"[RCAAgent] Classification: {classification['failure_type']}")
        return new_state

    except Exception as e:
        logger.error(f"[RCAAgent] Failed: {e}")
        new_state["error"] = f"RCA agent failed: {str(e)}"
        new_state["final_status"] = "failed"
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "rca",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "failed",
            "message": str(e),
        }]
        return new_state