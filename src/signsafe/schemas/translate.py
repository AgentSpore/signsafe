"""Translation DTOs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Locale = Literal["en", "ru", "zh", "es", "de", "fr"]


class TranslateRequest(BaseModel):
    target_locale: Locale
    # List of strings to translate, preserves order + length
    items: list[str] = Field(min_length=1, max_length=200)


class TranslateResponse(BaseModel):
    items: list[str]
