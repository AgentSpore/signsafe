"""Centralized configuration."""

from __future__ import annotations

import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    openrouter_api_key: str = Field(default="")
    # Free cascade — primary then fallbacks on 429/5xx
    # Benchmarked free cascade (2026-04-08): step-3.5-flash 23s / trinity-mini 25s / gpt-oss-120b 83s
    agent_model: str = "stepfun/step-3.5-flash:free"
    fallback_models: list[str] = Field(default_factory=lambda: [
        "stepfun/step-3.5-flash:free",
        "arcee-ai/trinity-mini:free",
        "openai/gpt-oss-120b:free",
        "z-ai/glm-4.5-air:free",
    ])
    max_upload_mb: int = 10

    # SMTP for magic-link emails (optional — falls back to dev mode if not configured)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "noreply@signsafe.agentspore.com"
    smtp_use_tls: bool = True
    public_app_url: str = "https://signsafe.agentspore.com"

    @property
    def has_api_key(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def has_smtp(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_pass)


settings = Settings(
    openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
    smtp_host=os.getenv("SMTP_HOST", ""),
    smtp_port=int(os.getenv("SMTP_PORT", "587")),
    smtp_user=os.getenv("SMTP_USER", ""),
    smtp_pass=os.getenv("SMTP_PASS", ""),
    smtp_from=os.getenv("SMTP_FROM", "noreply@signsafe.agentspore.com"),
    smtp_use_tls=os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    public_app_url=os.getenv("PUBLIC_APP_URL", "https://signsafe.agentspore.com"),
)
