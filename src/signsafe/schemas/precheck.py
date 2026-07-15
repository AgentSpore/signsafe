"""Typed non-analysis results.

The analyze pipeline can end in three ways: a normal ``AnalysisResult``, an explicit
"this document type is not supported in RU v1" result, or a "this does not look like a
contract" result. The last two are *typed values*, never exceptions or a hallucinated
analysis — the endpoint inspects the ``status`` discriminator and streams the RU message.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class UnsupportedModeResult(BaseModel):
    """A deprecated US-law preset was requested — never silently re-analyze under RU law."""

    status: Literal["unsupported_mode"] = "unsupported_mode"
    industry: str
    message: str = Field(
        default="Режим не поддерживается в RU v1. Загрузите договор в поддерживаемой категории."
    )


class NotContractResult(BaseModel):
    """The uploaded text does not look like a contract (deterministic local pre-check)."""

    status: Literal["not_contract"] = "not_contract"
    message: str = Field(
        default=(
            "Это не похоже на договор. Загрузите договор найма или другой договор в PDF — "
            "экспериментальный разбор работает только с текстом договоров."
        )
    )
