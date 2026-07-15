"""Deterministic, local (no-LLM) heuristic: does the text look like a contract?

Runs BEFORE the model so a random PDF (receipt, article, screenshot) yields a friendly
typed "это не похоже на договор" result instead of a hallucinated analysis or an
exception. Keyword + structural signals only — cheap and offline.
"""

from __future__ import annotations

import re

# Distinct contract signals (RU-first, EN fallback). Each contributes at most once.
_CONTRACT_MARKERS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"\bдоговор\b",
        r"\bсоглашени\w+\b",
        r"\bсторон\w+\b",
        r"\bпредмет\s+договор\w*",
        r"\bобязу\w+\b|\bобязательств\w+\b",
        r"\bответственност\w+\b",
        r"\bреквизит\w+\b",
        r"\bподпис\w+\b",
        r"\bименуем\w+\b",
        r"\bнаниматель\b|\bнаймодатель\b|\bарендатор\b|\bарендодатель\b",
        r"\bнастоящ\w+\s+договор\w*",
        # EN fallback
        r"\bagreement\b|\bcontract\b",
        r"\bparty\b|\bparties\b",
        r"\bhereby\b|\bwhereas\b|\bterms\s+and\s+conditions\b",
    )
)

_MIN_CHARS = 200
_MIN_MARKERS = 2


def looks_like_contract(text: str) -> bool:
    """True if the extracted text has enough contract-like signal to analyze."""
    if len(text.strip()) < _MIN_CHARS:
        return False
    hits = sum(1 for marker in _CONTRACT_MARKERS if marker.search(text))
    return hits >= _MIN_MARKERS
