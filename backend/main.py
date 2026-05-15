"""
Autonomous CI/CD Failure Fixer — FastAPI Backend
=================================================
Entry point for the multi-agent pipeline server.

Routes:
  GET  /health                    — health check (used by Docker)
  GET  /                          — root info
  POST /webhook/github            — GitHub webhook receiver
  GET  /workflows/                — list all workflows
  GET  /workflows/{id}            — get workflow detail
  GET  /workflows/{id}/logs       — get raw logs
  GET  /workflows/{id}/trace      — get agent trace
  GET  /demo/scenarios            — list demo scenarios
  POST /demo/trigger/{scenario}   — fire a demo scenario
  DELETE /demo/reset              — clear demo data
"""

import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers.github import router as github_router
# ── Ensure the app directory is on sys.path when running inside Docker ──────
sys.path.insert(0, os.path.dirname(__file__))

from config import settings
from database import init_db
from routers import webhook_router, workflows_router, demo_router

# ── Logging setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan: startup / shutdown ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and workspace on startup."""
    logger.info("=== Autonomous CI/CD Failure Fixer — Backend Starting ===")

    # Create SQLite tables
    init_db()
    logger.info(f"[Startup] Database initialised at: {settings.database_url}")

    # Ensure workspace directory exists
    os.makedirs(settings.workspace_dir, exist_ok=True)
    logger.info(f"[Startup] Workspace directory: {settings.workspace_dir}")

    # Log active LLM configuration
    if settings.gemini_api_key:
        logger.info(f"[Startup] LLM: Gemini ({settings.llm_model})")
    elif settings.openrouter_api_key:
        logger.info("[Startup] LLM: OpenRouter (fallback)")
    else:
        logger.warning("[Startup] No LLM API key set — deterministic-only mode")

    if settings.demo_mode:
        logger.info("[Startup] Running in DEMO MODE — webhook signatures not required")

    logger.info("=== Backend ready ===")
    yield

    logger.info("=== Backend shutting down ===")


# ── FastAPI application ───────────────────────────────────────────────────────
app = FastAPI(
    title="Autonomous CI/CD Failure Fixer",
    description=(
        "An AI DevOps Engineer that autonomously diagnoses, fixes, validates, "
        "and recovers failed software deployments using a real multi-agent pipeline."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS — allow the Next.js frontend on any port during dev ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",   # Docker service name
        "*",                       # Broad for hackathon demo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(webhook_router)
app.include_router(workflows_router)
app.include_router(demo_router)
app.include_router(github_router)


# ── Core endpoints ────────────────────────────────────────────────────────────
@app.get("/", tags=["root"])
def root():
    """Root endpoint — returns system info."""
    return {
        "name": "Autonomous CI/CD Failure Fixer",
        "version": "1.0.0",
        "status": "operational",
        "demo_mode": settings.demo_mode,
        "llm_model": settings.llm_model,
        "docs": "/docs",
        "agents": [
            "intake",
            "rca",
            "fix_generation",
            "validation",
            "reflection",
            "incident_report",
        ],
    }


@app.get("/health", tags=["root"])
def health():
    """
    Health check used by Docker Compose and load balancers.
    Returns 200 when the app is ready to accept requests.
    """
    return {"status": "healthy", "demo_mode": settings.demo_mode}


@app.get("/config", tags=["root"])
def get_config():
    """Return safe (non-secret) runtime configuration."""
    return {
        "demo_mode": settings.demo_mode,
        "llm_model": settings.llm_model,
        "max_retries": settings.max_retries,
        "has_gemini": bool(settings.gemini_api_key),
        "has_openrouter": bool(settings.openrouter_api_key),
        "has_github_token": bool(settings.github_token),
        "workspace_dir": settings.workspace_dir,
    }


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )