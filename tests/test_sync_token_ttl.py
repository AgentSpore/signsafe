"""Magic-link token expiry.

TOKEN_TTL_SEC was declared but never used: consume_magic_token SELECTed created_at and
ignored it, so an expired token still authenticated. The opportunistic DELETE only swept
OTHER rows, and ran after the current token had already been accepted.

This matters beyond the bug: the privacy copy states the login link expires in 15 minutes,
and copy that the code does not enforce is exactly the class of overclaim under review.
"""

from __future__ import annotations

import pytest

from signsafe.core.database import close_db, get_db, init_db
from signsafe.services.sync_service import TOKEN_TTL_SEC, SyncService


@pytest.fixture(autouse=True)
async def _db():
    await init_db()
    yield
    await close_db()


async def _age_token(token: str, seconds: int) -> None:
    """Backdate a token's created_at by `seconds`."""
    async with get_db() as db:
        await db.execute(
            "UPDATE magic_tokens SET created_at = datetime('now', ?) WHERE token = ?",
            (f"-{seconds} seconds", token),
        )
        await db.commit()


async def test_fresh_token_is_accepted() -> None:
    svc = SyncService()
    token = await svc.create_magic_token("user@example.com")
    assert await svc.consume_magic_token(token) == "user@example.com"


async def test_expired_token_is_rejected() -> None:
    svc = SyncService()
    token = await svc.create_magic_token("user@example.com")
    await _age_token(token, TOKEN_TTL_SEC + 60)
    assert await svc.consume_magic_token(token) is None, (
        "an expired magic token still authenticated — the 15-minute TTL is not enforced"
    )


async def test_token_just_inside_the_window_is_accepted() -> None:
    svc = SyncService()
    token = await svc.create_magic_token("user@example.com")
    await _age_token(token, TOKEN_TTL_SEC - 60)
    assert await svc.consume_magic_token(token) == "user@example.com"


async def test_token_is_single_use() -> None:
    svc = SyncService()
    token = await svc.create_magic_token("user@example.com")
    assert await svc.consume_magic_token(token) == "user@example.com"
    assert await svc.consume_magic_token(token) is None


async def test_unknown_token_is_rejected() -> None:
    assert await SyncService().consume_magic_token("nope") is None
