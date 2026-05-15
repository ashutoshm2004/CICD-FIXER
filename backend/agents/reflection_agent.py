"""
Reflection / Retry Agent
=========================
Responsibilities:
- Analyze why the previous fix attempt failed
- Generate an improved fix strategy
- Track retry count and prevent infinite loops
- Max 2 retries before escalating to partial success

Uses LLM only when previous fix logic was deterministic but failed.
"""

import json
import logging
from datetime import datetime
from agents.state import WorkflowState
from config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


def _analyze_failure(state: WorkflowState) -> str:
    """Analyze why the validation failed and suggest a different approach."""
    validation = state.get("validation_result", {})
    fix = (state.get("proposed_fix")or {})
    classification = (state.get("parsed_failure")or {})

    failed_commands = [
        r for r in validation.get("commands_run", [])
        if r.get("returncode", 0) != 0
    ]

    if not failed_commands:
        return "Validation failed for unknown reason. Try a different approach."

    # Build context for retry
    failure_context = []
    for cmd in failed_commands[:3]:
        failure_context.append(
            f"Command: {cmd['command']}\n"
            f"Error: {cmd.get('stderr', '')[:500]}\n"
            f"Output: {cmd.get('stdout', '')[:500]}"
        )

    original_strategy = fix.get("strategy", "Unknown strategy")
    failure_type = classification.get("failure_type", "unknown")

    return (
        f"Original strategy '{original_strategy}' failed.\n"
        f"Failure type: {failure_type}\n"
        f"Failed commands:\n" + "\n".join(failure_context)
    )


def _llm_reflect(state: WorkflowState, failure_summary: str) -> str:
    """
    Use Gemini Flash to understand why the fix failed and suggest an alternative.
    Returns a hint to be added to the state for the next fix attempt.
    """
    try:
        import google.generativeai as genai
        if not settings.gemini_api_key:
            raise ValueError("No Gemini API key")

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        classification = state.get("parsed_failure", {})
        original_fix = state.get("proposed_fix", {})

        prompt = f"""You are a senior DevOps engineer debugging a CI/CD fix that didn't work.

ORIGINAL PROBLEM:
Type: {classification.get('failure_type', 'unknown')}
Language: {classification.get('language', 'generic')}

ORIGINAL FIX ATTEMPTED:
{json.dumps(original_fix, indent=2)[:1000]}

WHY IT FAILED:
{failure_summary}

Suggest a DIFFERENT fix strategy in 2-3 sentences. Be concrete about what to try next.
Do not repeat the same approach. Focus on the most likely alternative fix.
Return ONLY the suggestion text, no JSON, no markdown."""

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        logger.warning(f"[ReflectionAgent] LLM reflection failed: {e}")
        return "Try alternative approach: review the error output manually and adjust the fix accordingly."


def should_retry(
    state: WorkflowState
) -> str:
    """
    LangGraph conditional
    routing function.

    Returns:
    - reflection
    - incident_report
    """

    validation = state.get(
        "validation_result",
        {}
    )

    logger.info(
        f"[ReflectionAgent] "
        f"validation={validation}"
    )

    retry_count = state.get(
        "retry_count",
        0,
    )

    # Success
    if validation.get(
        "passed",
        False,
    ):
        return (
            "incident_report"
        )

    # Retry limit reached
    if (
        retry_count
        >= MAX_RETRIES
    ):
        logger.info(
            f"[ReflectionAgent] "
            f"Max retries "
            f"({MAX_RETRIES}) "
            f"reached"
        )

        return (
            "incident_report"
        )

    # Retry path
    return "reflection"


def reflection_agent(state: WorkflowState) -> WorkflowState:
    """Reflection agent node for LangGraph."""
    logger.info(f"[ReflectionAgent] Starting for workflow {state['workflow_id']}, retry {state.get('retry_count', 0)}")
    new_state = {**state, "current_agent": "reflection"}

    try:
        # Analyze why the fix failed
        failure_summary = _analyze_failure(state)

        # Get LLM-powered reflection hint
        hint = _llm_reflect(state, failure_summary)

        # Increment retry counter
        new_retry_count = state.get("retry_count", 0) + 1
        new_state["retry_count"] = new_retry_count

        # Inject hint into parsed_failure for next fix attempt
        if new_state.get("parsed_failure"):
            new_state["parsed_failure"] = {
                **new_state["parsed_failure"],
                "reflection_hint": hint,
                "retry_count": new_retry_count,
            }

        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "reflection",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "completed",
            "message": f"Retry {new_retry_count}/{MAX_RETRIES}: {hint[:100]}...",
            "data": {"hint": hint, "retry_count": new_retry_count, "failure_summary": failure_summary[:500]},
        }]

        logger.info(f"[ReflectionAgent] Retry {new_retry_count}, hint: {hint[:80]}")
        return new_state

    except Exception as e:
        logger.error(f"[ReflectionAgent] Failed: {e}")
        new_state["retry_count"] = state.get("retry_count", 0) + 1
        new_state["agent_messages"] = state.get("agent_messages", []) + [{
            "agent": "reflection",
            "timestamp": datetime.utcnow().isoformat(),
            "event": "failed",
            "message": str(e),
        }]
        return new_state