"""In-app rate limiting.

Lives in its own module so both the app factory (main) and the routers can import the
limiter without a circular import.

POST /api/analyze is unauthenticated and expensive (OCR + an LLM cascade), so it is
limited in-app rather than trusting an edge proxy we have not verified.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Per-client-IP. No default_limits: only explicitly decorated routes are limited.
limiter = Limiter(key_func=get_remote_address)
