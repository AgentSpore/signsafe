"""Stateless lease analysis — no persistence."""

from __future__ import annotations

from loguru import logger

from signsafe.core.config import settings
from signsafe.schemas.document import AnalysisResult
from signsafe.schemas.industry import get_focus
from signsafe.services.agents import lease_agent, make_model
from signsafe.services.pdf_service import ExtractedDocument


class AnalysisService:
    """Runs the AI forensics pipeline on an extracted PDF. Stateless — no DB."""

    async def analyze(
        self, extracted: ExtractedDocument, industry: str | None = None
    ) -> AnalysisResult:
        focus = get_focus(industry)
        ocr_note = (
            "\n\nNOTE: This text was extracted via OCR from a scanned document — "
            "minor character errors may exist; focus on substantive clauses.\n"
            if extracted.used_ocr
            else ""
        )
        prompt = (
            f"Analyze this commercial lease and return the structured forensics report.\n\n"
            f"INDUSTRY CONTEXT: {focus}\n{ocr_note}\n"
            f"LEASE TEXT ({extracted.num_pages} pages):\n\n{extracted.full_text[:60000]}"
        )
        logger.info("Running lease agent on {} pages", extracted.num_pages)
        last_exc: Exception | None = None
        for model_name in settings.fallback_models:
            try:
                result = await lease_agent.run(prompt, model=make_model(model_name))
                logger.info("Analysis succeeded with {}", model_name)
                return result.output
            except Exception as exc:
                logger.warning("Model {} failed: {}", model_name, type(exc).__name__)
                last_exc = exc
                continue
        raise RuntimeError(f"All free models failed: {last_exc}")
