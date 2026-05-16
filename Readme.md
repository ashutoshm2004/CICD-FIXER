
# 🚀 ARGUS - Autonomous CI/CD Failure Fixer

<div align="center">

### **An AI DevOps Engineer that autonomously diagnoses, fixes, validates, and recovers failed CI/CD deployments**

### 🏆 **Built for Scaler School of Technology — Ascent ANVIL Hackathon 2026**

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-purple)](https://www.langchain.com/langgraph)
[![Gemini](https://img.shields.io/badge/Gemini-Flash-orange)](https://aistudio.google.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)](https://sqlite.org/)

### ⚡ Detect → Diagnose → Fix → Validate → Recover

*Transform failed CI/CD pipelines into autonomous recovery workflows with AI-powered DevOps intelligence.*

</div>

---

# 📌 Overview

Modern software deployments fail constantly.

Engineering teams spend countless hours manually debugging:

- ❌ Dependency conflicts  
- ❌ Failed tests  
- ❌ Missing environment variables  
- ❌ Docker build failures  
- ❌ TypeScript compilation issues  
- ❌ Broken imports & configurations  
- ❌ Package mismatches  
- ❌ CI/CD pipeline failures  

## Autonomous CI/CD Failure Fixer solves this problem end-to-end.

When a deployment fails, the system autonomously:

1. **Receives** a GitHub webhook (or demo trigger)  
2. **Fetches** CI/CD failure logs  
3. **Classifies** the root cause  
4. **Generates** concrete file patches  
5. **Validates** fixes using real commands  
6. **Retries intelligently** using a Reflection Agent  
7. **Creates GitHub Pull Requests automatically**  
8. **Generates detailed incident reports**

> Think of it as an **AI DevOps Engineer** for failed deployments.

---

# ✨ Key Features

### 🤖 True Multi-Agent Architecture
Specialized agents collaborate autonomously instead of relying on a single LLM prompt chain.

### 🔍 Root Cause Analysis
Detects and classifies failures:

- Dependency mismatches
- Missing environment variables
- Docker build issues
- TypeScript errors
- Failing tests
- Broken imports

### 🛠 Autonomous Fix Generation
Automatically patches:

- `requirements.txt`
- `package.json`
- `Dockerfile`
- `.env.example`
- Config files
- Import paths

### ✅ Deterministic Validation
Runs real commands:

```bash
pytest
npm install
npm build
npm test
docker build
flake8
eslint
```

### 🔁 Reflection & Retry Loop
Failed fixes are analyzed and retried intelligently (max 2 retries).

### 📊 Incident Reporting
Generates:

- Root Cause Analysis (RCA)
- Timeline
- Confidence Score
- Validation Evidence
- Remediation Summary

### 🐳 Local-First & Completely Free
- No AWS required
- No Kubernetes required
- No paid infrastructure
- Fully Dockerized
- Replayable deterministic demo mode

---

# 🏗 System Architecture

```mermaid
flowchart TD

A[GitHub Webhook / Demo Trigger] --> B[Intake Agent]

B --> C[RCA Agent]
C --> D[Fix Generation Agent]
D --> E[Validation Agent]

E -->|Pass| F[Incident Report Agent]
E -->|Fail| G[Reflection Agent]

G --> D

F --> H[GitHub PR Creation]
F --> I[Incident Report]
F --> J[Dashboard Update]

subgraph Backend [FastAPI Backend]
B
C
D
E
G
F
end

subgraph Storage
K[(SQLite Database)]
end

Backend --> K

subgraph Frontend
L[Next.js Dashboard]
end

J --> L
```

---

# 🧠 Multi-Agent Workflow

```mermaid
sequenceDiagram

participant GitHub
participant Intake
participant RCA
participant Fixer
participant Validator
participant Reflection
participant Incident

GitHub->>Intake: Workflow Failed Webhook
Intake->>RCA: Failure Context + Logs
RCA->>Fixer: Root Cause + Confidence
Fixer->>Validator: Generated Patch

alt Validation Passed
Validator->>Incident: Success Logs
Incident->>GitHub: Create PR + Comment
Incident->>GitHub: Incident Report
else Validation Failed
Validator->>Reflection: Failure Reason
Reflection->>Fixer: Improved Strategy
end
```

---

# 🛠 Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | FastAPI |
| Orchestration | LangGraph |
| LLM | GROQ + Gemini Flash Fallback + OpenRouter Fallback |
| Database | SQLite |
| Containerization | Docker Compose |
| CI/CD Integration | GitHub API + Webhooks |

---

# 🚀 Quick Start

## 1️⃣ Clone Repository

```bash
git clone <repo-url>
cd cicd-failure-fixer
```

---

## 2️⃣ Configure Environment

```bash
cp .env.example .env
```

Add required variables:

```env
GEMINI_API_KEY=your_key_here
OPENROUTER_API_KEY=optional
GITHUB_TOKEN=optional
GITHUB_WEBHOOK_SECRET=optional
DEMO_MODE=true
```

---

## 3️⃣ Run with Docker Compose

```bash
docker compose up --build
```

### Services

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

# 🎬 Demo Scenarios

The project includes **5 intentionally broken repositories** for deterministic demos.

| Scenario | Failure Type | Difficulty |
|----------|--------------|------------|
| `env_missing` | Missing `DATABASE_URL` | 🟢 Easy |
| `dep_conflict` | Package dependency mismatch | 🟡 Medium |
| `docker_build` | Broken Docker build | 🟡 Medium |
| `ts_error` | TypeScript compilation issue | 🔴 Hard |
| `test_failure` | Failing tests | 🔴 Hard |

### Trigger Demo

```bash
curl -X POST http://localhost:8000/demo/trigger/env_missing
curl -X POST http://localhost:8000/demo/trigger/dep_conflict
curl -X POST http://localhost:8000/demo/trigger/docker_build
curl -X POST http://localhost:8000/demo/trigger/ts_error
curl -X POST http://localhost:8000/demo/trigger/test_failure
```

Then open:

```text
http://localhost:3000
```

to watch the agents collaborate.

---

# 📂 Project Structure

```text
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

---

# 🤖 Agent System

## 1. Intake Agent
Receives GitHub webhook events and extracts failure logs.

## 2. RCA Agent
Performs root cause analysis using deterministic parsing + LLM reasoning.

## 3. Fix Generation Agent
Generates patches for dependencies, configs, Docker files, and source code.

## 4. Validation Agent
Runs deterministic checks:

```bash
pytest
npm build
docker build
```

## 5. Reflection Agent
Retries failed fixes intelligently.

## 6. Incident Report Agent
Creates:

- GitHub PR Summary
- Incident Timeline
- Root Cause Report
- Validation Evidence

---

# 🔄 Workflow Lifecycle

```mermaid
graph LR

A[CI/CD Failure] --> B[Log Collection]
B --> C[Root Cause Analysis]
C --> D[Fix Generation]
D --> E[Validation]

E -->|Success| F[PR Creation]
E -->|Failure| G[Reflection]

G --> D
F --> H[Incident Report]
```

---

# 🌟 Why This Project Matters

CI/CD failures cost engineering teams:

- ⏳ Engineering time  
- 💰 Productivity loss  
- 🚀 Slower release velocity  
- 😵 Developer frustration  

This project demonstrates how **autonomous AI systems can become engineering copilots**, reducing repetitive debugging work and accelerating deployments.

---

# 🛣 Future Roadmap

- [ ] Real GitHub PR creation
- [ ] Slack/Discord incident alerts
- [ ] Kubernetes deployment diagnostics
- [ ] Historical incident memory
- [ ] Autonomous rollback support
- [ ] Multi-repository orchestration

---

# 🏆 Hackathon Details

**Event:** Scaler School of Technology — Ascent ANVIL Hackathon 2026  
**Track:** Multi-Agent Autonomous Pipeline  
**Category:** Enterprise DevOps Automation using AI Agents

---

# 🤝 Contributing

Contributions, ideas, and improvements are welcome.

```bash
fork → clone → branch → commit → PR
```

---

# 👨‍💻 Team

<div align="center">

<table>
<tr>
<td align="center" width="50%">

### **Ashutosh Kshitij Mishra**

<a href="https://www.linkedin.com/in/ashutoshm04/">
  <img src="https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin" />
</a>
<a href="https://github.com/ashutoshm2004">
  <img src="https://img.shields.io/badge/GitHub-Follow-black?logo=github" />
</a>

</td>

<td align="center" width="50%">

### **Aditya Kumar Pandey**

<a href="https://www.linkedin.com/in/aditya-kumar-pandey-7915a7347/">
  <img src="https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin" />
</a>
<a href="https://github.com/adityakumarpandey1">
  <img src="https://img.shields.io/badge/GitHub-Follow-black?logo=github" />
</a>

</td>
</tr>
</table>

</div>
---

# 📜 License

MIT License © 2026

---



