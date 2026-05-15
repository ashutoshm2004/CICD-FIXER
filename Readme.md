# 🤖 Autonomous CI/CD Failure Fixer

> **An AI DevOps Engineer that autonomously diagnoses, fixes, validates, and recovers failed software deployments.**

---

## What it does

When a GitHub Actions workflow fails, this system:

1. **Receives** the webhook (or you trigger a demo scenario)
2. **Fetches** the full failure logs from GitHub
3. **Classifies** the root cause — dependency conflict, missing env var, Docker failure, TypeScript error, failing tests
4. **Generates** concrete file patches (`requirements.txt`, `Dockerfile`, `package.json`, `.env.example`, etc.)
5. **Validates** the fix by running real commands (`pip install`, `npm build`, `pytest`, `docker build`)
6. **Retries** up to 2× with a Reflection agent that analyzes what went wrong
7. **Creates** a GitHub PR + posts a comment with the fix
8. **Generates** a full incident report with timeline, evidence, and remediation steps

## Architecture

```
GitHub Webhook
     │
     ▼
┌─────────────────────────────────────────────────┐
│                 FastAPI Backend                  │
│                                                 │
│  ┌──────────┐  ┌─────┐  ┌──────────┐           │
│  │  Intake  │→ │ RCA │→ │  Fix Gen │           │
│  │  Agent   │  │Agent│  │  Agent   │           │
│  └──────────┘  └─────┘  └──────────┘           │
│                               │                 │
│                               ▼                 │
│  ┌────────────┐  ┌──────────────────┐           │
│  │ Reflection │← │   Validation     │           │
│  │   Agent   │  │     Agent        │           │
│  └────────────┘  └──────────────────┘           │
│        │                  │ (pass)               │
│        └──────────────────▼                     │
│                   ┌───────────────┐             │
│                   │    Incident   │             │
│                   │ Report Agent  │             │
│                   └───────────────┘             │
│                                                 │
│  Orchestrated by: LangGraph                     │
│  Database: SQLite                               │
└─────────────────────────────────────────────────┘
     │
     ▼
Next.js Dashboard (port 3000)
```

## Quick Start

### 1. Clone & configure

```bash
git clone <repo>
cd cicd-failure-fixer
cp .env.example .env
# Edit .env — at minimum set GEMINI_API_KEY
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- **Backend API:** http://localhost:8000
- **Frontend Dashboard:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

### 3. Run a demo (no GitHub needed)

Open http://localhost:3000/demo and click any scenario, or:

```bash
curl -X POST http://localhost:8000/demo/trigger/env_missing
curl -X POST http://localhost:8000/demo/trigger/dep_conflict
curl -X POST http://localhost:8000/demo/trigger/docker_build
curl -X POST http://localhost:8000/demo/trigger/ts_error
curl -X POST http://localhost:8000/demo/trigger/test_failure
```

Then open http://localhost:3000 to watch the agents run.

## Demo Scenarios

| Key | Failure | Difficulty |
|-----|---------|------------|
| `env_missing` | `DATABASE_URL` not set → Python `KeyError` | Easy |
| `dep_conflict` | `numpy==1.24.0` conflicts with `torch>=2.0` | Medium |
| `docker_build` | `COPY config/production.yaml` — file doesn't exist | Medium |
| `ts_error` | `UserRecord[]` not assignable to `Record<string,unknown>[]` | Hard |
| `test_failure` | pytest fails — fee calculation changed after refactor | Hard |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Recommended | Google Gemini Flash API key |
| `OPENROUTER_API_KEY` | Optional | Fallback LLM provider |
| `GITHUB_TOKEN` | Optional | For real webhook mode (PR creation) |
| `GITHUB_WEBHOOK_SECRET` | Optional | Webhook signature verification |
| `DEMO_MODE` | — | Default `true` — skips signature check |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Orchestration | LangGraph |
| Backend | FastAPI + SQLite |
| Frontend | Next.js 14 + Tailwind CSS |
| LLM | Gemini 1.5 Flash (+ OpenRouter fallback) |
| Containerisation | Docker Compose |
| GitHub | REST API v3 |

## Project Structure

```
cicd-failure-fixer/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings (pydantic-settings)
│   ├── database.py              # SQLAlchemy models + SQLite
│   ├── agents/
│   │   ├── graph.py             # LangGraph DAG definition
│   │   ├── state.py             # Shared WorkflowState TypedDict
│   │   ├── intake_agent.py      # Log fetching + parsing
│   │   ├── rca_agent.py         # Root cause classification
│   │   ├── fix_agent.py         # Patch generation
│   │   ├── validation_agent.py  # Deterministic test runner
│   │   ├── reflection_agent.py  # Retry + improvement logic
│   │   └── incident_agent.py    # Report + PR creation
│   ├── routers/
│   │   ├── webhook.py           # GitHub webhook receiver
│   │   ├── workflows.py         # Workflow CRUD API
│   │   └── demo.py              # Demo scenario triggers
│   ├── tools/
│   │   ├── github_tool.py       # GitHub API wrapper
│   │   ├── log_parser.py        # Log signal extraction
│   │   ├── file_patcher.py      # Unified diff + file editing
│   │   └── shell_executer.py    # Safe subprocess runner
│   └── demo/
│       ├── scenarios.py         # Scenario registry
│       └── fixtures/            # 5 pre-built JSON log fixtures
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       └── components/          # Reusable UI components
├── docker-compose.yml
└── .env.example
```

## Agents

### 1. Intake Agent
Fetches CI logs from GitHub API (or uses pre-loaded fixture in demo mode). Writes logs to workspace. Extracts initial signals.

### 2. RCA Agent
Uses deterministic regex patterns first (zero LLM tokens), falls back to Gemini for complex/unknown failures. Outputs `FailureClassification` with confidence score.

### 3. Fix Generation Agent
Maps failure type → deterministic fix strategy. For simple cases (missing env var, version pins) no LLM needed. For complex cases (TypeScript, test logic) uses Gemini.

### 4. Validation Agent
Runs real shell commands in a sandboxed workspace. No LLM involved. Pure deterministic pass/fail.

### 5. Reflection Agent
If validation fails and retries remain, analyzes what went wrong and produces an improved fix strategy. Max 2 retries enforced.

### 6. Incident Report Agent
Generates structured markdown report, GitHub PR description, and posts a comment. Works in demo mode without a real GitHub token.