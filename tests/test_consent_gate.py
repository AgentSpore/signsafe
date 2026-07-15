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


def test_consent_is_validated_but_not_stored() -> None:
    # Stateless: only the config (accepted versions) and the endpoint (validation) may
    # mention consent — nothing persists it.
    hits = {
        p.name for p in SRC_DIR.rglob("*.py")
        if "consent" in p.read_text(encoding="utf-8").lower()
    }
    assert hits <= {"config.py", "documents.py"}
