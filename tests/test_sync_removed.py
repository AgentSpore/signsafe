"""Guard: the cross-device sync capability stays REMOVED.

Sync persisted an email, magic-link tokens and "encrypted" analyses. It was removed
rather than fixed because:
  * it was NOT zero-knowledge — crypto.ts derived the AES key from the user's email via
    PBKDF2 with no passphrase, and the server stored that same email in sync_blobs.email,
    right next to the ciphertext. Anyone with the DB had both the ciphertext and its key
    input;
  * there was no delete endpoint, so the 152-ФЗ erasure right had no implementation;
  * it required an email, contradicting the product's own no-account promise.

Its removal is what makes «на сервере не сохраняется ничего» structurally true: the
database went with it. These tests fail if any of it returns, because its return would
silently invalidate shipped privacy copy.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from signsafe.main import app

client = TestClient(app)

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "signsafe"
FRONTEND = ROOT / "frontend"

DELETED_FILES = [
    SRC / "api" / "sync.py",
    SRC / "services" / "sync_service.py",
    SRC / "services" / "email_service.py",
    SRC / "schemas" / "sync.py",
    SRC / "core" / "database.py",
    FRONTEND / "lib" / "sync.ts",
    FRONTEND / "lib" / "crypto.ts",
    FRONTEND / "components" / "sync-panel.tsx",
    FRONTEND / "app" / "sync" / "verify" / "page.tsx",
]

SYNC_ROUTES = ["/api/sync/put", "/api/sync/get", "/api/sync/magic-link", "/api/sync/consume"]


@pytest.mark.parametrize("path", DELETED_FILES, ids=lambda p: f"{p.parent.name}/{p.name}")
def test_sync_implementation_files_are_gone(path: Path) -> None:
    assert not path.exists(), (
        f"{path.relative_to(ROOT)} is back. Sync was removed deliberately — reinstating it "
        "requires a real user passphrase, a delete endpoint, and a privacy-copy change."
    )


def test_no_sync_route_is_registered() -> None:
    routes = {getattr(r, "path", "") for r in app.routes}
    assert not any("sync" in r for r in routes), f"a sync route is registered again: {routes}"


@pytest.mark.parametrize("route", SYNC_ROUTES)
@pytest.mark.parametrize("method", ["POST", "GET"])
def test_sync_routes_are_unreachable(route: str, method: str) -> None:
    resp = client.request(method, route, json={"email": "a@b.c"})
    assert resp.status_code in (404, 405), (
        f"{method} {route} returned {resp.status_code} — the endpoint is alive"
    )


def _code_only(source: str) -> str:
    """Drop whole-line # comments. Comments EXPLAINING the removal are expected and must
    not mask a real reintroduction — the same reason the frontend guard strips //."""
    return "\n".join(
        line for line in source.splitlines() if not line.strip().startswith("#")
    )


def test_there_is_no_database_layer_at_all() -> None:
    # The DB existed ONLY for sync (magic_tokens + sync_blobs were the only tables).
    # With sync gone there is nowhere to store anything — which is what makes the
    # "we store nothing" claim structural rather than a promise.
    offenders = []
    for p in SRC.rglob("*.py"):
        if p.name == "outbound.py":
            continue  # the egress inventory documents the removal in prose
        code = _code_only(p.read_text(encoding="utf-8"))
        for needle in ("aiosqlite", "get_db(", "init_db(", "magic_tokens", "sync_blobs"):
            if needle in code:
                offenders.append(f"{p.relative_to(ROOT)}:{needle}")
    assert not offenders, f"a persistence layer reappeared: {offenders}"


def test_database_guard_would_catch_a_real_reintroduction() -> None:
    # Guard the guard: stripping comments must not make the check vacuous.
    assert "get_db(" not in _code_only("# async with get_db() as db:")
    assert "get_db(" in _code_only("    async with get_db() as db:")


def test_no_smtp_or_email_config_remains() -> None:
    # SMTP existed only to deliver magic links.
    config = (SRC / "core" / "config.py").read_text(encoding="utf-8").lower()
    for needle in ("smtp", "public_app_url"):
        assert needle not in config, f"{needle} config survived the sync removal"


def test_sync_dependencies_are_dropped() -> None:
    pyproject = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
    for dep in ("aiosqlite", "aiosmtplib", "email-validator"):
        assert dep not in pyproject, f"{dep} is still declared but only sync used it"


def test_frontend_has_no_sync_or_crypto_surface() -> None:
    hits: dict[str, list[str]] = {}
    live = ('from "@/lib/sync"', 'from "./sync"', "@/lib/crypto", "SyncPanel",
            "sync-panel", "pushSync(", "pullSync(", "consumeMagicToken(", "/api/sync")
    for sub in ("lib", "app", "components"):
        for pattern in ("*.ts", "*.tsx"):
            for p in (FRONTEND / sub).rglob(pattern):
                code = p.read_text(encoding="utf-8")
                found = [n for n in live if n in code]
                if found:
                    hits[str(p.relative_to(ROOT))] = found
    assert not hits, f"frontend still references the removed sync path: {hits}"
