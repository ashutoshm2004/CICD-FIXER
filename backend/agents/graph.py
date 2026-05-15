"""
LangGraph Workflow Graph
=========================
Flow for manual repo fixing + CI/CD fixing.

Flow:
intake
↓
validation (execute repo)
↓
passed? ── yes → incident
↓ no
rca
↓
fix
↓
validation
↓
passed? ── yes → incident
↓ no + retries left
reflection
↓
fix
↓
validation
↓
incident (after retries exhausted)
"""

import logging
from typing import Literal

from langgraph.graph import (
    StateGraph,
    END,
)

from agents.state import (
    WorkflowState,
)

from agents.intake_agent import (
    intake_agent,
)

from agents.rca_agent import (
    rca_agent,
)

from agents.fix_agent import (
    fix_agent,
)

from agents.validation_agent import (
    validation_agent,
)

from agents.reflection_agent import (
    reflection_agent,
    should_retry,
)

from agents.incident_agent import (
    incident_agent,
)

logger = logging.getLogger(
    __name__
)


def _route_after_validation(
    state: WorkflowState
) -> Literal[
    "rca",
    "reflection",
    "incident",
]:
    """
    Validation routing logic.

    Cases:
    1. Passed
       → incident

    2. Failed first time
       → rca

    3. Failed after fix
       → reflection
    """

    validation = (
        state.get(
            "validation_result"
        )
        or {}
    )

    passed = validation.get(
        "passed",
        False,
    )

    retry_count = state.get(
        "retry_count",
        0,
    )

    # Success
    if passed:
        logger.info(
            "[Graph] "
            "Validation passed "
            "→ incident"
        )

        return "incident"

    # First failure
    if retry_count == 0:
        logger.info(
            "[Graph] "
            "Initial failure "
            "→ rca"
        )

        return "rca"

    # Retry flow
    result = should_retry(
        state
    )

    if result == (
        "incident_report"
    ):
        logger.info(
            "[Graph] "
            "Max retries "
            "reached "
            "→ incident"
        )

        return "incident"

    logger.info(
        "[Graph] "
        "Retry flow "
        "→ reflection"
    )

    return "reflection"


def build_graph():
    """
    Build and compile
    LangGraph workflow.
    """

    graph = StateGraph(
        WorkflowState
    )

    # ──────────────────────
    # Nodes
    # ──────────────────────
    graph.add_node(
        "intake",
        intake_agent,
    )

    graph.add_node(
        "validation",
        validation_agent,
    )

    graph.add_node(
        "rca",
        rca_agent,
    )

    graph.add_node(
        "fix_generation",
        fix_agent,
    )

    graph.add_node(
        "reflection",
        reflection_agent,
    )

    graph.add_node(
        "incident",
        incident_agent,
    )

    # ──────────────────────
    # Entry point
    # ──────────────────────
    graph.set_entry_point(
        "intake"
    )

    # ──────────────────────
    # Flow
    # ──────────────────────

    # Intake → execute repo
    graph.add_edge(
        "intake",
        "validation",
    )

    # Validation routing
    graph.add_conditional_edges(
        "validation",
        _route_after_validation,
        {
            "rca":
                "rca",

            "reflection":
                "reflection",

            "incident":
                "incident",
        },
    )

    # RCA → Fix
    graph.add_edge(
        "rca",
        "fix_generation",
    )

    # Reflection → Fix
    graph.add_edge(
        "reflection",
        "fix_generation",
    )

    # Fix → Validation
    graph.add_edge(
        "fix_generation",
        "validation",
    )

    # Incident → END
    graph.add_edge(
        "incident",
        END,
    )

    compiled = (
        graph.compile()
    )

    logger.info(
        "[Graph] "
        "LangGraph workflow "
        "compiled successfully"
    )

    return compiled


# Singleton graph
_compiled_graph = None


def get_graph():
    global _compiled_graph

    if (
        _compiled_graph
        is None
    ):
        _compiled_graph = (
            build_graph()
        )

    return (
        _compiled_graph
    )


async def run_workflow(
    initial_state:
        WorkflowState,
):
    """
    Run workflow.
    """

    graph = get_graph()

    try:
        logger.info(
            f"[Graph] "
            f"Starting workflow "
            f"{initial_state['workflow_id']}"
        )

        final_state = (
            graph.invoke(
                initial_state
            )
        )

        logger.info(
            f"[Graph] "
            f"Workflow "
            f"{initial_state['workflow_id']} "
            f"completed: "
            f"{final_state.get('final_status')}"
        )

        return final_state

    except Exception as e:
        logger.error(
            f"[Graph] "
            f"Workflow crashed: "
            f"{e}"
        )

        return {
            **initial_state,
            "final_status":
                "failed",
            "error":
                str(e),
            "current_agent":
                "graph",
        }