"""
Validation Agent
================
Responsibilities:
- Execute repository deterministically
- Validate fixes after patching
- Capture stdout/stderr cleanly
- No LLM calls

Supports:
- Python
- Node
- Next.js
- Docker
"""

import logging
from datetime import datetime

from agents.state import (
    WorkflowState,
)
from tools.execution_engine import (
    ExecutionEngine,
)

logger = logging.getLogger(
    __name__
)


def validation_agent(
    state: WorkflowState
) -> WorkflowState:
    """
    LangGraph validation node.

    Executes the cloned project
    and captures runtime/build
    failures deterministically.
    """

    workflow_id = state[
        "workflow_id"
    ]

    logger.info(
        f"[ValidationAgent] "
        f"Starting for "
        f"workflow "
        f"{workflow_id}"
    )

    new_state = {
        **state,
        "current_agent":
            "validation",
    }

    workspace = state.get(
        "workspace_path"
    )

    if not workspace:
        logger.error(
            "[ValidationAgent] "
            "No workspace path"
        )

        new_state[
            "validation_result"
        ] = {
            "passed":
                False,
            "commands_run":
                [],
            "summary":
                (
                    "No workspace "
                    "available"
                ),
        }

        return new_state

    try:
        engine = (
            ExecutionEngine()
        )

        result = (
            engine.run_project(
                workspace
            )
        )

        command = (
            f"python "
            f"{result.get('entry_file')}"
            if result.get(
                "project_type"
            )
            == "python"
            else result.get(
                "project_type",
                "unknown",
            )
        )

        validation_result = {
            "passed":
                result.get(
                    "success",
                    False,
                ),

            "commands_run": [
                {
                    "command":
                        command,

                    "stdout":
                        result.get(
                            "stdout",
                            "",
                        ),

                    "stderr":
                        result.get(
                            "stderr",
                            "",
                        ),

                    "returncode":
                        result.get(
                            "returncode",
                            -1,
                        ),
                }
            ],

            "summary":
                (
                    "Execution passed"
                    if result.get(
                        "success"
                    )
                    else
                    "Execution failed"
                ),
        }

        logger.info(
            f"[ValidationAgent] "
            f"validation_result="
            f"{validation_result}"
        )

        new_state[
            "validation_result"
        ] = validation_result

        new_state[
            "execution_error"
        ] = result.get(
            "stderr",
            "",
        )

        new_state[
            "project_type"
        ] = result.get(
            "project_type"
        )

        new_state[
            "entry_file"
        ] = result.get(
            "entry_file"
        )

        new_state[
            "agent_messages"
        ] = (
            state.get(
                "agent_messages",
                [],
            )
            + [
                {
                    "agent":
                        "validation",
                    "timestamp":
                        datetime.utcnow()
                        .isoformat(),
                    "event":
                        "completed",
                    "message":
                        validation_result[
                            "summary"
                        ],
                    "data": {
                        "passed":
                            validation_result[
                                "passed"
                            ],
                        "project_type":
                            result.get(
                                "project_type"
                            ),
                    },
                }
            ]
        )

        logger.info(
            f"[ValidationAgent] "
            f"Executed "
            f"{result.get('project_type')}"
        )

        return new_state

    except Exception as e:
        logger.error(
            f"[ValidationAgent] "
            f"Failed: {e}"
        )

        new_state[
            "validation_result"
        ] = {
            "passed":
                False,
            "commands_run":
                [],
            "summary":
                (
                    f"Validation "
                    f"error: {str(e)}"
                ),
        }

        new_state[
            "agent_messages"
        ] = (
            state.get(
                "agent_messages",
                [],
            )
            + [
                {
                    "agent":
                        "validation",
                    "timestamp":
                        datetime.utcnow()
                        .isoformat(),
                    "event":
                        "failed",
                    "message":
                        str(e),
                }
            ]
        )

        return new_state