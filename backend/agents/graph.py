"""
LangGraph Workflow Graph
=========================
Defines the multi-agent DAG with conditional edges for:
- Normal flow: intake → rca → fix → validate → incident
- Retry flow: validate (fail) → reflect → fix → validate (again, max 2x)
- Error handling at every node

Node definitions:
1. intake       — parse logs, fetch context
2. rca          — classify failure
3. fix          — generate patches
4. validation   — run deterministic tests
5. reflection   — analyze failure, increment retry
6. incident     — generate report, create PR

Edges:
- All nodes connect sequentially
- After validation: if pass → incident, if fail + retries left → reflection
- After reflection → fix (retry loop)
- Max 2 retries enforced in reflection_agent.should_retry()
"""

import logging
from typing import Literal

from langgraph.graph import StateGraph, END

from agents.state import WorkflowState
from agents.intake_agent import intake_agent
from agents.rca_agent import rca_agent
from agents.fix_agent import fix_agent
from agents.validation_agent import validation_agent
from agents.reflection_agent import reflection_agent, should_retry
from agents.incident_agent import incident_agent

logger = logging.getLogger(__name__)


def _route_after_validation(state: WorkflowState) -> Literal["reflection", "incident"]:
    """
    Conditional routing after validation.
    If validation passed OR max retries reached → incident
    If validation failed AND retries remain → reflection
    """
    result = should_retry(state)
    # should_retry returns "reflection" or "incident_report" — remap the latter
    if result == "incident_report":
        result = "incident"
    logger.info(f"[Graph] Routing after validation: {result}")
    return result


def _route_after_intake(state: WorkflowState) -> Literal["rca", "end"]:
    """Short-circuit if intake failed catastrophically."""
    if state.get("final_status") == "failed" and not state.get("raw_logs"):
        return "end"
    return "rca"


def build_graph() -> StateGraph:
    """Build and compile the LangGraph workflow."""
    graph = StateGraph(WorkflowState)

    # ── Add nodes ──────────────────────────────────────────────────────────────
    graph.add_node("intake", intake_agent)
    graph.add_node("rca", rca_agent)
    graph.add_node("fix_generation", fix_agent)
    graph.add_node("validation", validation_agent)
    graph.add_node("reflection", reflection_agent)
    graph.add_node("incident", incident_agent)   # renamed from incident_report

    # ── Set entry point ────────────────────────────────────────────────────────
    graph.set_entry_point("intake")

    # ── Add edges ──────────────────────────────────────────────────────────────

    # Intake → RCA (conditional: skip if catastrophic failure)
    graph.add_conditional_edges(
        "intake",
        _route_after_intake,
        {
            "rca": "rca",
            "end": END,
        }
    )

    # RCA → Fix Generation (always)
    graph.add_edge("rca", "fix_generation")

    # Fix Generation → Validation (always)
    graph.add_edge("fix_generation", "validation")

    # Validation → conditional routing
    graph.add_conditional_edges(
        "validation",
        _route_after_validation,
        {
            "reflection": "reflection",
            "incident": "incident",
        }
    )

    # Reflection → Fix Generation (retry loop)
    graph.add_edge("reflection", "fix_generation")

    # Incident → END
    graph.add_edge("incident", END)

    return graph.compile()


# Singleton compiled graph
_compiled_graph = None


def get_graph():
    """Get or create the compiled LangGraph instance."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
        logger.info("[Graph] LangGraph workflow compiled successfully")
    return _compiled_graph


async def run_workflow(initial_state: WorkflowState) -> WorkflowState:
    """
    Run the full multi-agent workflow and return final state.
    Handles async execution and error propagation.
    """
    graph = get_graph()

    try:
        logger.info(f"[Graph] Starting workflow {initial_state['workflow_id']}")
        final_state = graph.invoke(initial_state)
        logger.info(f"[Graph] Workflow {initial_state['workflow_id']} completed: {final_state.get('final_status')}")
        return final_state
    except Exception as e:
        logger.error(f"[Graph] Workflow {initial_state['workflow_id']} crashed: {e}")
        return {
            **initial_state,
            "final_status": "failed",
            "error": str(e),
            "current_agent": "graph",
        }