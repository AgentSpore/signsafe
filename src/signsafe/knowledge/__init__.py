"""Predatory clause knowledge base."""

from pathlib import Path
import json

_PATTERNS_FILE = Path(__file__).parent / "predatory_patterns.json"


def load_patterns() -> list[dict]:
    return json.loads(_PATTERNS_FILE.read_text(encoding="utf-8"))
