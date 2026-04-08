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

    @property
    def has_api_key(self) -> bool:
        return bool(self.openrouter_api_key)


settings = Settings(openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""))
