"""Guard: the translation capability stays REMOVED.

`/api/translate` was a public endpoint that forwarded arbitrary caller strings to Google
Translate. Deleting the frontend caller did not close it — any client could POST raw
contract text to our own endpoint and reach Google, which made the privacy claim
"the AI provider is the only third party that receives anything from your document" false.
(That provider was OpenRouter when this guard was written; it is z.ai now. The claim's
shape — exactly ONE third-party recipient — is what these tests defend.)

The capability was removed rather than gated. These tests fail if it comes back, because
its return would silently invalidate shipped user-facing privacy copy.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from signsafe.main import app
from signsafe.services.outbound import EGRESS_REGISTRY, KNOWN_THIRD_PARTY_HOSTS

client = TestClient(app)

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "signsafe"
FRONTEND = ROOT / "frontend"

# Files that implemented the translate path. None may return.
DELETED_FILES = [
    SRC / "api" / "translate.py",
    SRC / "services" / "translate_service.py",
    SRC / "schemas" / "translate.py",
    FRONTEND / "lib" / "translate.ts",
    FRONTEND / "components" / "locale-switcher.tsx",
]


@pytest.mark.parametrize("path", DELETED_FILES, ids=lambda p: p.name)
def test_translate_implementation_files_are_gone(path: Path) -> None:
    assert not path.exists(), (
        f"{path.relative_to(ROOT)} is back. The translate path was removed deliberately "
        "— reinstating it requires changing the privacy copy first (outbound.py)."
    )


def test_translate_endpoint_is_not_registered() -> None:
    routes = {getattr(r, "path", "") for r in app.routes}
    assert "/api/translate" not in routes, "the /api/translate route is registered again"
    assert not any("translate" in r for r in routes), f"a translate-ish route exists: {routes}"


@pytest.mark.parametrize("method", ["POST", "GET", "PUT"])
def test_translate_endpoint_is_unreachable(method: str) -> None:
    # Not just "the POST caller is gone" — no verb may reach it. That was codex's point:
    # the public endpoint, not its caller, was the hole.
    resp = client.request(method, "/api/translate", json={"items": ["x"], "target_locale": "en"})
    assert resp.status_code in (404, 405), (
        f"{method} /api/translate returned {resp.status_code} — endpoint is alive"
    )


def test_no_google_translate_host_anywhere_in_backend() -> None:
    # outbound.py is exempt: it IS the egress inventory and documents the removal (plus
    # the rule for ever bringing it back) in prose. Anywhere else, a googleapis mention
    # means the host became reachable again.
    hits = [
        str(p.relative_to(ROOT))
        for p in SRC.rglob("*.py")
        if p.name != "outbound.py" and "googleapis" in p.read_text(encoding="utf-8")
    ]
    assert not hits, f"Google Translate host reappeared in: {hits}"


def test_inventory_no_longer_lists_google_as_a_live_egress() -> None:
    assert KNOWN_THIRD_PARTY_HOSTS == {"api.z.ai"}
    assert not any("translate" in mod for mod in EGRESS_REGISTRY)
    assert not any("Google" in dest for dest in EGRESS_REGISTRY.values())


def test_no_translate_service_references_remain() -> None:
    hits = []
    for p in SRC.rglob("*.py"):
        text = p.read_text(encoding="utf-8")
        if "TranslateService" in text or "get_translate_service" in text:
            hits.append(str(p.relative_to(ROOT)))
    assert not hits, f"dangling translate-service references in: {hits}"


_COMMENT = re.compile(r"//[^\n]*|/\*.*?\*/", re.DOTALL)

# Executable constructs that would mean the round-trip is actually back. Comments
# EXPLAINING the removal are expected and must not trip this — so strip them first,
# then look for real code (imports, JSX, calls, fetch targets).
_LIVE_USAGE = (
    'from "@/lib/translate"',
    'from "./translate"',
    "locale-switcher",
    "<LocaleSwitcher",
    "loadUIStrings(",
    "uiStringsList(",
    '"/api/translate"',
    "`/api/translate",
)


def _frontend_sources() -> list[Path]:
    files: list[Path] = []
    for sub in ("lib", "app", "components"):
        for pattern in ("*.ts", "*.tsx"):
            files.extend((FRONTEND / sub).rglob(pattern))
    return files


def test_frontend_has_no_translate_round_trip() -> None:
    hits: dict[str, list[str]] = {}
    for path in _frontend_sources():
        code = _COMMENT.sub("", path.read_text(encoding="utf-8"))
        found = [needle for needle in _LIVE_USAGE if needle in code]
        if found:
            hits[str(path.relative_to(ROOT))] = found
    assert not hits, f"frontend still calls the removed translate path: {hits}"


def test_frontend_test_would_catch_a_real_reintroduction() -> None:
    # Guard the guard: the comment-stripping above must not make the check vacuous.
    code = _COMMENT.sub("", '// import { loadUIStrings } from "@/lib/translate";\n')
    assert not any(n in code for n in _LIVE_USAGE)  # a comment is ignored...
    live = _COMMENT.sub("", 'import { loadUIStrings } from "@/lib/translate";\n')
    assert any(n in live for n in _LIVE_USAGE)  # ...but real code is caught
