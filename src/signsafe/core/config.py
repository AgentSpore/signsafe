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
    # Resource controls (152-ФЗ hardening + zip/decompression-bomb guard)
    max_pdf_pages: int = 40
    ocr_timeout_seconds: int = 60
    # TOTAL wall-clock budget for extraction+OCR of one document. The per-page OCR
    # timeout alone is not a bound: 40 pages x 60s would occupy a worker for ~40 min.
    max_extraction_seconds: int = 120

    # In-app rate limit for the unauthenticated, expensive POST /api/analyze (LLM
    # cascade + OCR). Do not rely on an unverified edge proxy.
    rate_limit_analyze: str = "10/minute"

    # Versioned consent required by /api/analyze (152-ФЗ). Requests must carry one of
    # these; consent is validated but NOT stored (the service stays stateless).
    accepted_consent_versions: list[str] = Field(default_factory=lambda: ["ru-v1"])

    # CORS — tightened from "*" to the known origins (config-driven).
    allowed_origins: list[str] = Field(default_factory=lambda: [
        "https://signsafe.agentspore.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])

    # SMTP for magic-link emails (optional — falls back to dev mode if not configured)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "noreply@signsafe.agentspore.com"
    smtp_use_tls: bool = True
    public_app_url: str = "https://signsafe.agentspore.com"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def has_api_key(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def has_smtp(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_pass)


def _env_origins() -> list[str] | None:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw:
        return None
    return [o.strip() for o in raw.split(",") if o.strip()]


_origins = _env_origins()

settings = Settings(
    openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
    rate_limit_analyze=os.getenv("RATE_LIMIT_ANALYZE", "10/minute"),
    **({"allowed_origins": _origins} if _origins else {}),
    smtp_host=os.getenv("SMTP_HOST", ""),
    smtp_port=int(os.getenv("SMTP_PORT", "587")),
    smtp_user=os.getenv("SMTP_USER", ""),
    smtp_pass=os.getenv("SMTP_PASS", ""),
    smtp_from=os.getenv("SMTP_FROM", "noreply@signsafe.agentspore.com"),
    smtp_use_tls=os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    public_app_url=os.getenv("PUBLIC_APP_URL", "https://signsafe.agentspore.com"),
)
