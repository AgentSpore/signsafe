"""The retry policy and the operator-visible failure type of the LLM client.

z.ai's free tier throttles at roughly 3 concurrent requests and answers 429 (code 1302)
rather than queueing. The deployment runs a SINGLE free model, so there is no second model
to fail over to — retry with backoff IS the resilience, and it is tested rather than
assumed.

TWO invariants are pinned here, and both were real bugs caught in review:

1. EXACTLY ONE retry layer. Layers stack silently and multiply rather than share: a
   tenacity transport beneath the SDK's own default produced 12 outbound calls for ONE
   logical call. So attempt COUNTS are asserted through the real client, never through a
   bare httpx client — a transport-only test cannot see a bug that lives between layers.

2. The failure TYPE names the real cause. services/analysis_service.py logs
   type(exc).__name__ and deliberately nothing else (see core/errors.py: an exception VALUE
   embeds the request body, i.e. contract text). The type is therefore the operator's ONLY
   signal, and 429 is the EXPECTED steady-state failure here — so a throttle reporting
   itself as a network fault would be a diagnostic trap on the most common failure.

Both are properties of the assembled client, so every test drives the real
_build_openai_client() with only the innermost socket mocked.
"""

from __future__ import annotations

import httpx
import openai
import pytest

from signsafe.services.agents import _MAX_RETRIES, _build_openai_client

EXPECTED_CALLS = _MAX_RETRIES + 1


@pytest.fixture(autouse=True)
def no_backoff_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    """Collapse the SDK's real backoff sleeps so the suite stays fast.

    A Retry-After: 0 header will NOT do this — the SDK only honours the header when
    0 < value <= 60, so zero falls through to the exponential schedule and every retry test
    would really sleep (~3s each, ~13s on the suite). Only the retry COUNT and the surfaced
    TYPE are under test here; the wait schedule is the SDK's own, tested upstream.
    """
    monkeypatch.setattr(
        "openai._base_client.BaseClient._calculate_retry_timeout",
        lambda *args, **kwargs: 0.0,
    )


def drive(handler):
    """Build the real production client against `handler`, mocking only the socket.

    Everything above the socket — retry policy, backoff, error mapping — is the real thing.
    """
    calls = {"n": 0}

    def counting(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return handler(request)

    client = _build_openai_client()
    # Swap the transport under the assembled client rather than building a fresh
    # AsyncClient, so the client under test stays the one the deployment uses.
    #
    # `_client` (the httpx.AsyncClient) and `_transport` are private to openai/httpx —
    # verified against openai 2.30.0. If a future SDK renames either, these tests fail at
    # AttributeError rather than silently passing, which is the intended failure mode: the
    # invariant they pin (exactly one retry layer) cannot be checked from outside.
    client._client._transport = httpx.MockTransport(counting)
    return client, calls


async def failure_of(handler) -> tuple[type, int]:
    """Return (exception type an operator would see, outbound call count)."""
    client, calls = drive(handler)
    with pytest.raises(Exception) as excinfo:
        await client.chat.completions.create(
            model="glm-4.5-flash", messages=[{"role": "user", "content": "x"}]
        )
    return type(excinfo.value), calls["n"]


def throttled(code: str):
    """A z.ai 429 carrying `code` — 1302 is a transient throttle, 1113 a permanent quota."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"code": code}})

    return handler


@pytest.mark.asyncio
async def test_a_throttle_reports_itself_as_a_rate_limit_and_is_retried() -> None:
    """429/1302 — the expected steady-state failure. Operator must see a rate limit."""
    exc_type, calls = await failure_of(throttled("1302"))

    assert exc_type is openai.RateLimitError, (
        f"operator would see {exc_type.__name__} for a throttle. "
        "analysis_service logs the TYPE only — it must name the real cause."
    )
    assert calls == EXPECTED_CALLS


@pytest.mark.asyncio
async def test_an_exhausted_quota_also_reports_as_a_rate_limit() -> None:
    """429/1113 ("insufficient balance") is PERMANENT but arrives as 429.

    A transient throttle is deliberately NOT told apart at this layer: the discriminator is
    response BODY, and a retry hook that could read it runs before httpx has read the stream
    (verified — response.json() there raises ResponseNotRead on a real async transport).
    Splitting the two would mean reading the body out from under the SDK, for a case that
    cannot occur on the default free model. RateLimitError is honest for both: it points the
    operator at quota, which is right for 1113 and 1302 alike.
    """
    exc_type, calls = await failure_of(throttled("1113"))

    assert exc_type is openai.RateLimitError
    assert calls == EXPECTED_CALLS


@pytest.mark.asyncio
async def test_an_upstream_5xx_reports_as_a_server_error_and_is_retried() -> None:
    exc_type, calls = await failure_of(lambda request: httpx.Response(503, json={}))

    assert exc_type is openai.InternalServerError
    assert calls == EXPECTED_CALLS


@pytest.mark.asyncio
async def test_a_dead_socket_reports_as_a_connection_error() -> None:
    """The one case where a connection error IS the truth. It must stay distinguishable
    against a throttle: keeping those two apart is the whole point of the type invariant.
    """

    def dead(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    exc_type, calls = await failure_of(dead)

    assert exc_type is openai.APIConnectionError
    assert calls == EXPECTED_CALLS


@pytest.mark.asyncio
async def test_a_permanent_error_is_not_retried() -> None:
    """A bad key is not a throttle: retrying wastes the budget and stalls the caller behind
    backoff. It must surface immediately, named for what it is."""
    exc_type, calls = await failure_of(
        lambda request: httpx.Response(401, json={"error": "invalid api key"})
    )

    assert exc_type is openai.AuthenticationError
    assert calls == 1, "a permanent auth failure must not be retried"


@pytest.mark.asyncio
async def test_a_throttle_that_clears_is_retried_until_it_succeeds() -> None:
    """The success path: retry exists to absorb the ~3-concurrent limit, not to fail
    more slowly."""
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(429, json={})
        return httpx.Response(
            200,
            json={
                "id": "1",
                "object": "chat.completion",
                "created": 0,
                "model": "glm-4.5-flash",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "ok"},
                        "finish_reason": "stop",
                    }
                ],
            },
        )

    client, _ = drive(handler)
    result = await client.chat.completions.create(
        model="glm-4.5-flash", messages=[{"role": "user", "content": "x"}]
    )

    assert calls["n"] == 3, "a 429 must be retried, not surfaced to the caller"
    assert result.choices[0].message.content == "ok"
