"""
Demo Scenarios
==============
5 pre-built, deterministic demo scenarios for hackathon demonstrations.
Each scenario has frozen log fixtures that simulate real CI failures.
"""

import json
import os
from typing import Dict, Any

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")

SCENARIOS = {
    "env_missing": {
        "fixture_file": "scenario_1_env.json",
        "display_name": "Missing Environment Variable",
        "description": "Python app crashes on startup — DATABASE_URL not set",
        "difficulty": "easy",
        "estimated_seconds": 15,
    },
    "dep_conflict": {
        "fixture_file": "scenario_2_dep.json",
        "display_name": "Broken Python Dependency",
        "description": "pip install fails — torch requires numpy>=1.26.0 but 1.24.0 is pinned",
        "difficulty": "medium",
        "estimated_seconds": 20,
    },
    "docker_build": {
        "fixture_file": "scenario_3_docker.json",
        "display_name": "Docker Build Failure",
        "description": "COPY instruction references config/production.yaml which doesn't exist",
        "difficulty": "medium",
        "estimated_seconds": 25,
    },
    "ts_error": {
        "fixture_file": "scenario_4_ts.json",
        "display_name": "TypeScript Build Error",
        "description": "Next.js build fails — UserRecord[] not assignable to Record<string,unknown>[]",
        "difficulty": "hard",
        "estimated_seconds": 30,
    },
    "test_failure": {
        "fixture_file": "scenario_5_test.json",
        "display_name": "Failing Tests",
        "description": "pytest fails — payment processor fee calculations changed after refactor",
        "difficulty": "hard",
        "estimated_seconds": 35,
    },
}


def load_scenario(scenario_key: str) -> Dict[str, Any]:
    """Load a scenario fixture by key."""
    if scenario_key not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_key}. Valid: {list(SCENARIOS.keys())}")

    scenario_meta = SCENARIOS[scenario_key]
    fixture_path = os.path.join(FIXTURE_DIR, scenario_meta["fixture_file"])

    with open(fixture_path, "r") as f:
        fixture = json.load(f)

    return {**scenario_meta, **fixture}


def list_scenarios() -> list:
    """List all available demo scenarios."""
    return [
        {
            "key": key,
            "display_name": meta["display_name"],
            "description": meta["description"],
            "difficulty": meta["difficulty"],
            "estimated_seconds": meta["estimated_seconds"],
        }
        for key, meta in SCENARIOS.items()
    ]