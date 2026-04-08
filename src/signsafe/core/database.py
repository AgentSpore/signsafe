"""Async SQLite — used only for cloud sync (encrypted blobs)."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import aiosqlite
from loguru import logger

DB_PATH = Path("signsafe.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS magic_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    consumed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_blobs (
    email TEXT PRIMARY KEY,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tokens_created ON magic_tokens(created_at);
"""


def _dict_row(cursor: aiosqlite.Cursor, row: tuple) -> dict:
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


_db: aiosqlite.Connection | None = None


async def _get_connection() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(str(DB_PATH))
        _db.row_factory = _dict_row
    return _db


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    db = await _get_connection()
    yield db


async def init_db() -> None:
    db = await _get_connection()
    await db.executescript(SCHEMA)
    await db.commit()
    logger.info("SignSafe sync database initialized at {}", DB_PATH)


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None
