from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True)
    repo_name = Column(String, nullable=False)
    repo_url = Column(String)
    branch = Column(String, default="main")
    commit_sha = Column(String)
    trigger_event = Column(String)  # webhook | demo
    scenario_name = Column(String)  # for demo mode

    # Status tracking
    status = Column(String, default="pending")  # pending | running | success | failed | partial
    current_agent = Column(String)

    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

    # Agent outputs (stored as JSON text)
    raw_logs = Column(Text)
    parsed_failure = Column(Text)  # JSON
    root_cause = Column(Text)      # JSON
    proposed_fix = Column(Text)    # JSON
    validation_result = Column(Text)  # JSON
    incident_report = Column(Text)  # JSON

    # Metrics
    confidence_score = Column(Float)
    retry_count = Column(Integer, default=0)
    pull_request_url = Column(String)
    github_comment_url = Column(String)

    # Full agent trace for dashboard
    agent_trace = Column(Text)  # JSON list of trace events


class AgentEvent(Base):
    __tablename__ = "agent_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String, nullable=False)
    agent_name = Column(String, nullable=False)
    event_type = Column(String)  # started | completed | failed | tool_call | message
    message = Column(Text)
    data = Column(Text)  # JSON
    timestamp = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()