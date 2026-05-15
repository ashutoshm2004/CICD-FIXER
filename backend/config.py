from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    database_url: str = "sqlite:////data/cicd_fixer.db"
    gemini_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    github_token: Optional[str] = None
    github_webhook_secret: str = "demo_secret"
    demo_mode: bool = True
    workspace_dir: str = "/data/workspace"

    # LLM settings
    llm_model: str = "gemini-1.5-flash"
    llm_temperature: float = 0.1
    max_retries: int = 2

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Ensure workspace exists
os.makedirs(settings.workspace_dir, exist_ok=True)