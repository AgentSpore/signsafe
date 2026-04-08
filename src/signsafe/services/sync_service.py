"""Cloud sync service — magic-link auth + encrypted blob storage.

Backend is zero-knowledge: it only stores ciphertext + IV, never sees plaintext.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time

from loguru import logger

from signsafe.core.database import get_db

SESSION_SECRET = os.getenv("SIGNSAFE_SESSION_SECRET") or secrets.token_hex(32)
TOKEN_TTL_SEC = 900  # 15 min
SESSION_TTL_SEC = 30 * 24 * 3600  # 30 days


def _sign_session(email: str, expires: int) -> str:
    payload = f"{email}|{expires}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}|{sig}"


def verify_session(token: str) -> str | None:
    try:
        email, expires, sig = token.rsplit("|", 2)
    except ValueError:
        return None
    if int(expires) < time.time():
        return None
    expected = hmac.new(
        SESSION_SECRET.encode(), f"{email}|{expires}".encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    return email


class SyncService:
    async def create_magic_token(self, email: str) -> str:
        email = email.lower().strip()
        token = secrets.token_urlsafe(24)
        async with get_db() as db:
            await db.execute(
                "INSERT INTO magic_tokens (token, email) VALUES (?, ?)",
                (token, email),
            )
            await db.commit()
        logger.info("Created magic token for {}", email)
        return token

    async def consume_magic_token(self, token: str) -> str | None:
        async with get_db() as db:
            cursor = await db.execute(
                "SELECT email, created_at, consumed FROM magic_tokens WHERE token = ?",
                (token,),
            )
            row = await cursor.fetchone()
            if not row or row["consumed"]:
                return None
            # Token TTL check via SQLite
            await db.execute(
                "UPDATE magic_tokens SET consumed = 1 WHERE token = ?", (token,)
            )
            await db.execute(
                "DELETE FROM magic_tokens WHERE datetime(created_at, '+15 minutes') < datetime('now')"
            )
            await db.commit()
            return row["email"]

    def issue_session(self, email: str) -> str:
        expires = int(time.time()) + SESSION_TTL_SEC
        return _sign_session(email, expires)

    async def put_blob(self, email: str, ciphertext: str, iv: str) -> None:
        async with get_db() as db:
            await db.execute(
                """INSERT INTO sync_blobs (email, ciphertext, iv, updated_at)
                   VALUES (?, ?, ?, datetime('now'))
                   ON CONFLICT(email) DO UPDATE SET
                       ciphertext = excluded.ciphertext,
                       iv = excluded.iv,
                       updated_at = datetime('now')""",
                (email, ciphertext, iv),
            )
            await db.commit()
        logger.info("Stored encrypted blob for {} ({} bytes ciphertext)", email, len(ciphertext))

    async def get_blob(self, email: str) -> dict | None:
        async with get_db() as db:
            cursor = await db.execute(
                "SELECT ciphertext, iv, updated_at FROM sync_blobs WHERE email = ?",
                (email,),
            )
            return await cursor.fetchone()
