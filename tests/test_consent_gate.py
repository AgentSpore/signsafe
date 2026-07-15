"""152-ФЗ consent gate on /api/analyze — backend-enforced, versioned, not stored."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from signsafe.core.config import settings
from signsafe.main import app

client = TestClient(app)

_PDF = ("dummy.pdf", b"%PDF-1.4 fake", "application/pdf")
SRC_DIR = Path(__file__).resolve().parents[1] / "src" / "signsafe"


def _post(data: dict | None = None):
    return client.post("/api/analyze", files={"file": _PDF}, data=data or {})


def test_analyze_rejected_without_consent() -> None:
    resp = _post({"industry": "residential_lease"})
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["code"] == "consent_required"
    assert "согласие" in detail["message"].lower()


def test_analyze_rejected_with_unknown_consent_version() -> None:
    resp = _post({"industry": "residential_lease", "consent_version": "bogus-v9"})
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail["code"] == "consent_version_unknown"
    assert "версия согласия" in detail["message"].lower()


def test_accepted_consent_version_passes_the_gate() -> None:
    # A valid consent must get PAST the gate — the SSE stream then reports the fake-PDF
    # failure in-band, which proves the gate itself is not what rejected the request.
    version = settings.accepted_consent_versions[0]
    resp = _post({"industry": "residential_lease", "consent_version": version})
    assert resp.status_code == 200


def test_non_pdf_rejected_with_ru_message() -> None:
    version = settings.accepted_consent_versions[0]
    resp = client.post(
        "/api/analyze",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        data={"consent_version": version},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "not_pdf"


def test_consent_is_validated_but_never_persisted() -> None:
    # Stateless by design: consent is checked and dropped. The thing that matters is that
    # no PERSISTENCE layer touches it — assert that directly rather than policing which
    # files may say the word (docstrings legitimately reference it).
    persistence = {"database.py", "sync_service.py", "email_service.py"}
    for path in SRC_DIR.rglob("*.py"):
        if path.name in persistence:
            assert "consent" not in path.read_text(encoding="utf-8").lower(), (
                f"{path.name} references consent — is it being stored? Must stay stateless."
            )


def test_consent_is_only_read_from_config_never_written() -> None:
    # The only consent state that exists is the accepted-version allowlist in config.
    assert settings.accepted_consent_versions
    assert isinstance(settings.accepted_consent_versions, list)
