"""Centralized configuration."""

from __future__ import annotations

import os
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

# Third-party hosts this deployment may send document-derived content to.
#
# HARDCODED ON PURPOSE. `llm_base_url` below is env-configurable so the provider can be
# swapped without a code change, but the user-facing privacy copy NAMES the provider that
# receives contract text. An operator must therefore not be able to redirect that text to
# an undisclosed third party via env alone: the copy would silently become false. Changing
# the provider requires editing this constant AND the privacy copy together — a source
# change, which the egress tripwires in tests/test_egress.py do catch.
#
# services/outbound.py re-exports this as KNOWN_THIRD_PARTY_HOSTS (the egress inventory).
ALLOWED_LLM_HOSTS: frozenset[str] = frozenset({"api.z.ai"})

# z.ai (Zhipu AI) speaks the OpenAI chat-completions dialect, so the pydantic-ai
# OpenAIProvider shape works unchanged. OpenRouter was the previous default and is NOT
# usable: it answers HTTP 403 "Access denied by security policy" to our hosts' ASNs at the
# edge — a deliberate geo-block, not a key or code fault, and not something a retry can
# fix. Routing around it via a proxy is forbidden by OpenRouter's ToS §5.7.
DEFAULT_LLM_BASE_URL = "https://api.z.ai/api/paas/v4"


class Settings(BaseModel):
    llm_api_key: str = Field(default="")
    # validate_default=True is load-bearing, not belt-and-braces: pydantic v2 skips field
    # defaults, so without it the host guard would fire ONLY on the env-override path. A
    # future edit to DEFAULT_LLM_BASE_URL that forgot ALLOWED_LLM_HOSTS would then build an
    # unvalidated Settings() at import and silently ship contract text to a host the privacy
    # copy does not name — the exact failure this constant exists to make impossible.
    llm_base_url: str = Field(default=DEFAULT_LLM_BASE_URL, validate_default=True)
    # ONE model, deliberately — not a cascade.
    #
    # Measured against this account (2026-07-15): glm-4.5-flash is the only dependably
    # free model (HTTP 200, correct Russian, ~1.6-3.4s). glm-4.7-flash is free per the
    # price list but answers 429 code 1302 (rate limit) and then times out on backoff.
    # Every other GLM (4.5/4.5-air/4.6/4.7/5/5-turbo/5.1/5.2) answers 429 code 1113
    # "Insufficient balance or no resource package" — they are PAID and the account has no
    # balance, so as cascade entries they could never succeed, only add latency.
    #
    # glm-4.5-flash's real failure mode is concurrency (~3 parallel requests before 429),
    # and that limit is per-account: a second free model would be throttled by the SAME
    # quota at the SAME moment, so a fallback correlates with the failure it is meant to
    # cover. Retry-with-backoff on 429 (services/agents.py) is the resilience that
    # actually applies here; a second model is not. The list stays a list so an operator
    # can extend it via LLM_FALLBACK_MODELS if z.ai's free tier grows.
    agent_model: str = "glm-4.5-flash"
    fallback_models: list[str] = Field(default_factory=lambda: ["glm-4.5-flash"])
    max_upload_mb: int = 10
    # Resource controls (152-ФЗ hardening + zip/decompression-bomb guard)
    max_pdf_pages: int = 40
    ocr_timeout_seconds: int = 60
    # TOTAL wall-clock budget for extraction+OCR of one document. The per-page OCR
    # timeout alone is not a bound: 40 pages x 60s would occupy a worker for ~40 min.
    max_extraction_seconds: int = 120

    # TOTAL wall-clock budget for the LLM cascade of one document, retries included.
    #
    # The per-request timeout in services/agents.py is NOT a bound on its own, for the same
    # reason the per-page OCR timeout is not: retries multiply it (4 attempts x 90s read +
    # backoff ~= 367s). This is the authoritative ceiling, and the arithmetic it anchors is:
    #
    #   max_extraction_seconds (120) + llm_total_seconds (120) = 240s backend ceiling
    #   frontend/app/api/[...path]/route.ts FETCH_TIMEOUT_MS = 250s (outer envelope)
    #
    # Those two numbers are deliberately related: the proxy must never abort first, or the
    # user gets an opaque 504 while a worker keeps grinding on a request nobody awaits.
    # Change one, change the other.
    llm_total_seconds: int = 120

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


    @field_validator("llm_base_url")
    @classmethod
    def _host_must_be_a_disclosed_egress(cls, value: str) -> str:
        """Reject an LLM endpoint the privacy copy does not name. See ALLOWED_LLM_HOSTS."""
        parsed = urlparse(value)
        # Scheme first: an ALLOWED host over http:// still puts lease-contract text on the
        # wire in cleartext, and the hostname check alone waves it through. The privacy copy
        # promises a specific recipient; it does not promise the whole internet a copy in
        # transit. TLS is not negotiable for this payload, so it is pinned here rather than
        # left to the provider's redirect.
        if parsed.scheme != "https":
            raise ValueError(
                f"llm_base_url scheme {parsed.scheme!r} is not https. Document text may "
                "only leave over TLS."
            )
        host = parsed.hostname
        if host not in ALLOWED_LLM_HOSTS:
            raise ValueError(
                f"llm_base_url host {host!r} is not a disclosed egress destination "
                f"({sorted(ALLOWED_LLM_HOSTS)}). The privacy copy names the provider that "
                "receives document text; sending it elsewhere requires updating "
                "ALLOWED_LLM_HOSTS, services/outbound.py and the user-facing copy together."
            )
        return value

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def has_api_key(self) -> bool:
        return bool(self.llm_api_key)


def _env_list(name: str) -> list[str] | None:
    """Comma-separated env var -> trimmed list, or None when unset/blank."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return None
    return [item.strip() for item in raw.split(",") if item.strip()]


_origins = _env_list("ALLOWED_ORIGINS")
_fallbacks = _env_list("LLM_FALLBACK_MODELS")
_model = os.getenv("LLM_MODEL", "").strip()
_base_url = os.getenv("LLM_BASE_URL", "").strip()

settings = Settings(
    # LLM_API_KEY is the provider-agnostic name; ZAI_API_KEY is what the deploy hosts
    # carry, so it keeps working without touching their .env.
    llm_api_key=os.getenv("LLM_API_KEY") or os.getenv("ZAI_API_KEY", ""),
    rate_limit_analyze=os.getenv("RATE_LIMIT_ANALYZE", "10/minute"),
    **({"llm_base_url": _base_url} if _base_url else {}),
    **({"agent_model": _model} if _model else {}),
    **({"fallback_models": _fallbacks} if _fallbacks else {}),
    **({"allowed_origins": _origins} if _origins else {}),
)
