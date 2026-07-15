"""Shared test fixtures."""

from __future__ import annotations

import pytest

from signsafe.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Isolate the in-app rate limit between tests.

    The limiter counts every request to /api/analyze, including ones that are rejected
    later by the consent gate. Without a reset, tests silently share one 10/minute
    budget and start 429-ing each other depending on collection order.
    """
    limiter.reset()
    yield
    limiter.reset()
