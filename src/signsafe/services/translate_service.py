"""LLM-based batch translator — chunked, with per-item fallback + in-memory cache."""

from __future__ import annotations

import asyncio
import hashlib

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

CHUNK_SIZE = 8  # Items per LLM call
MAX_CACHE_ENTRIES = 5000


class TranslationOutput(BaseModel):
    items: list[str] = Field(
        description="Translated strings — MUST be the exact same count and order as input"
    )


def _cache_key(text: str, locale: str) -> str:
    return hashlib.sha256(f"{locale}|{text}".encode()).hexdigest()[:32]


class TranslateService:
    def __init__(self) -> None:
        self._cache: dict[str, str] = {}

    def _cache_get(self, text: str, locale: str) -> str | None:
        if not text:
            return ""
        return self._cache.get(_cache_key(text, locale))

    def _cache_put(self, text: str, locale: str, translated: str) -> None:
        if not text:
            return
        if len(self._cache) >= MAX_CACHE_ENTRIES:
            # Drop ~10% oldest entries (FIFO via insertion order)
            for k in list(self._cache.keys())[: MAX_CACHE_ENTRIES // 10]:
                self._cache.pop(k, None)
        self._cache[_cache_key(text, locale)] = translated

    async def translate(self, items: list[str], target_locale: str) -> list[str]:
        if target_locale == "en" or not items:
            return items

        lang_name = LOCALE_NAMES.get(target_locale, "English")

        # Check cache first — separate cached vs missing
        cached: dict[int, str] = {}
        missing_indices: list[int] = []
        missing_items: list[str] = []
        for idx, item in enumerate(items):
            hit = self._cache_get(item, target_locale)
            if hit is not None:
                cached[idx] = hit
            else:
                missing_indices.append(idx)
                missing_items.append(item)

        if not missing_items:
            logger.info("Translation fully served from cache ({} items)", len(items))
            return [cached[i] for i in range(len(items))]

        logger.info(
            "Translation: {} cached, {} missing ({} chunks)",
            len(cached),
            len(missing_items),
            (len(missing_items) + CHUNK_SIZE - 1) // CHUNK_SIZE,
        )

        translated_missing = await self._translate_uncached(missing_items, lang_name)

        # Cache new results
        for orig, trans in zip(missing_items, translated_missing):
            self._cache_put(orig, target_locale, trans)

        # Reassemble in original order
        result: list[str] = [""] * len(items)
        for i, c in cached.items():
            result[i] = c
        for missing_pos, original_idx in enumerate(missing_indices):
            result[original_idx] = translated_missing[missing_pos]

        return result

    async def _translate_uncached(self, items: list[str], lang_name: str) -> list[str]:
        if not items:
            return []

        # Split into chunks
        chunks: list[list[str]] = [
            items[i : i + CHUNK_SIZE] for i in range(0, len(items), CHUNK_SIZE)
        ]
        logger.info(
            "Translating {} uncached items to {} in {} chunks",
            len(items),
            lang_name,
            len(chunks),
        )

        # Translate chunks in parallel (bounded concurrency)
        semaphore = asyncio.Semaphore(3)

        async def translate_chunk(chunk: list[str], idx: int) -> list[str]:
            async with semaphore:
                return await self._translate_chunk(chunk, lang_name, idx)

        tasks = [translate_chunk(chunk, i) for i, chunk in enumerate(chunks)]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        out: list[str] = []
        for result in results:
            out.extend(result)

        # Sanity: must match length
        if len(out) != len(items):
            logger.warning("Length mismatch: {} != {}, padding", len(out), len(items))
            if len(out) < len(items):
                out = out + items[len(out) :]
            else:
                out = out[: len(items)]

        return out

    async def _translate_chunk(
        self, chunk: list[str], lang_name: str, chunk_idx: int
    ) -> list[str]:
        if not chunk:
            return []

        numbered = "\n".join(f"[{i}] {text}" for i, text in enumerate(chunk))
        prompt = (
            f"Translate every item below from English into {lang_name}.\n\n"
            f"CRITICAL RULES:\n"
            f"1. You MUST translate ALL {len(chunk)} items.\n"
            f"2. Return EXACTLY {len(chunk)} items in the same order.\n"
            f"3. Preserve legal terminology accuracy.\n"
            f"4. Do NOT add commentary, do NOT skip items, do NOT merge items.\n"
            f"5. If an item is empty, return an empty string.\n\n"
            f"INPUT ({len(chunk)} items):\n{numbered}\n\n"
            f"OUTPUT: list of {len(chunk)} translated strings."
        )

        last_exc: Exception | None = None
        for model_name in settings.fallback_models:
            try:
                agent = Agent(
                    model=make_model(model_name),
                    system_prompt=(
                        f"You are a professional legal translator. Translate every item "
                        f"into {lang_name}. Never skip items. Never add commentary."
                    ),
                    output_type=PromptedOutput(TranslationOutput),
                    retries=1,
                )
                result = await agent.run(prompt)
                out = result.output.items

                if len(out) == len(chunk):
                    logger.debug(
                        "Chunk {} translated via {} ({} items)",
                        chunk_idx,
                        model_name,
                        len(out),
                    )
                    return out

                # Length mismatch — pad/truncate but log warning
                logger.warning(
                    "Chunk {} via {}: got {} items, expected {}",
                    chunk_idx,
                    model_name,
                    len(out),
                    len(chunk),
                )
                if len(out) < len(chunk):
                    out = out + chunk[len(out) :]
                else:
                    out = out[: len(chunk)]
                return out
            except Exception as exc:
                logger.warning(
                    "Translate chunk {} via {} failed: {}",
                    chunk_idx,
                    model_name,
                    type(exc).__name__,
                )
                last_exc = exc
                continue

        # All models failed → return originals (graceful fallback)
        logger.error("All models failed for chunk {}: {}", chunk_idx, last_exc)
        return chunk
