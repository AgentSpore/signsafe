"""LLM-based batch translator — reuses free model cascade."""

from __future__ import annotations

from loguru import logger
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.output import PromptedOutput

from signsafe.core.config import settings
from signsafe.services.agents import make_model


LOCALE_NAMES: dict[str, str] = {
    "en": "English",
    "ru": "Russian",
    "zh": "Simplified Chinese",
    "es": "Spanish",
    "de": "German",
    "fr": "French",
}


class TranslationOutput(BaseModel):
    items: list[str] = Field(description="Translated strings in the same order as input")


class TranslateService:
    async def translate(self, items: list[str], target_locale: str) -> list[str]:
        if target_locale == "en" or not items:
            return items
        lang_name = LOCALE_NAMES.get(target_locale, "English")
        numbered = "\n".join(f"[{i}] {text}" for i, text in enumerate(items))
        prompt = (
            f"Translate the following English items to {lang_name}. "
            f"Keep the exact same count and order. Preserve any special characters, "
            f"legal terminology, and punctuation. Return only the translated list.\n\n"
            f"INPUT ({len(items)} items):\n{numbered}"
        )
        last_exc: Exception | None = None
        for model_name in settings.fallback_models:
            try:
                agent = Agent(
                    model=make_model(model_name),
                    system_prompt="You are a professional legal translator.",
                    output_type=PromptedOutput(TranslationOutput),
                    retries=1,
                )
                result = await agent.run(prompt)
                out = result.output.items
                if len(out) != len(items):
                    logger.warning(
                        "Translation length mismatch: expected {}, got {}",
                        len(items),
                        len(out),
                    )
                    # Pad or truncate to preserve indices
                    if len(out) < len(items):
                        out = out + items[len(out):]
                    else:
                        out = out[:len(items)]
                logger.info("Translated {} items to {} via {}", len(items), target_locale, model_name)
                return out
            except Exception as exc:
                logger.warning("Translate model {} failed: {}", model_name, type(exc).__name__)
                last_exc = exc
                continue
        raise RuntimeError(f"Translation failed on all models: {last_exc}")
