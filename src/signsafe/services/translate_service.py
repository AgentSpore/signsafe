"""Google Translate (unofficial) batch translator with in-memory cache.

Uses translate.googleapis.com — free, no API key, fast (~50ms per call).
Replaces the LLM-based translator which was slow and unreliable due to LLM
dropping items / hitting OpenRouter rate limits.
"""

from __future__ import annotations

import asyncio
import hashlib

import httpx
from loguru import logger

GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single"
MAX_CACHE_ENTRIES = 5000
MAX_CONCURRENT = 8
PER_REQUEST_TIMEOUT = 15.0

LOCALE_TO_GOOGLE: dict[str, str] = {
    "en": "en",
    "ru": "ru",
    "zh": "zh-CN",
    "es": "es",
    "de": "de",
    "fr": "fr",
}


def _cache_key(text: str, locale: str) -> str:
    return hashlib.sha256(f"{locale}|{text}".encode()).hexdigest()[:32]


class TranslateService:
    def __init__(self) -> None:
        self._cache: dict[str, str] = {}
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=PER_REQUEST_TIMEOUT,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SignSafe/1.0)"},
            )
        return self._client

    def _cache_get(self, text: str, locale: str) -> str | None:
        if not text:
            return ""
        return self._cache.get(_cache_key(text, locale))

    def _cache_put(self, text: str, locale: str, translated: str) -> None:
        if not text:
            return
        if len(self._cache) >= MAX_CACHE_ENTRIES:
            for k in list(self._cache.keys())[: MAX_CACHE_ENTRIES // 10]:
                self._cache.pop(k, None)
        self._cache[_cache_key(text, locale)] = translated

    async def translate(self, items: list[str], target_locale: str) -> list[str]:
        if target_locale == "ru" or not items:
            return items

        google_lang = LOCALE_TO_GOOGLE.get(target_locale, "en")

        # Cache lookup
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
            logger.info("Translation: {} items fully from cache", len(items))
            return [cached[i] for i in range(len(items))]

        logger.info(
            "Translation: {} cached, {} via Google Translate -> {}",
            len(cached),
            len(missing_items),
            google_lang,
        )

        translated_missing = await self._translate_batch(missing_items, google_lang)

        for orig, trans in zip(missing_items, translated_missing):
            self._cache_put(orig, target_locale, trans)

        result: list[str] = [""] * len(items)
        for i, c in cached.items():
            result[i] = c
        for missing_pos, original_idx in enumerate(missing_indices):
            result[original_idx] = translated_missing[missing_pos]
        return result

    async def _translate_batch(self, items: list[str], google_lang: str) -> list[str]:
        if not items:
            return []
        sem = asyncio.Semaphore(MAX_CONCURRENT)

        async def one(text: str) -> str:
            async with sem:
                return await self._translate_one(text, google_lang)

        return await asyncio.gather(*(one(t) for t in items))

    async def _translate_one(self, text: str, google_lang: str) -> str:
        if not text or not text.strip():
            return text

        client = await self._get_client()
        params = {
            "client": "gtx",
            "sl": "ru",
            "tl": google_lang,
            "dt": "t",
            "q": text,
        }
        try:
            resp = await client.get(GOOGLE_ENDPOINT, params=params)
            resp.raise_for_status()
            data = resp.json()
            # Format: [[["translation","original",null,null,...], ...], null, "en", ...]
            if not data or not data[0]:
                return text
            translated = "".join(
                segment[0] for segment in data[0] if segment and segment[0]
            )
            return translated or text
        except Exception as exc:
            logger.warning("Google Translate failed for snippet: {}", type(exc).__name__)
            return text  # graceful fallback to original

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
