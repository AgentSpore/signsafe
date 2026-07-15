"""Stateless analyze endpoint — upload PDF and stream results via SSE."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from loguru import logger
from sse_starlette.sse import EventSourceResponse

from signsafe.core.config import settings
from signsafe.core.deps import get_analysis_service, get_pdf_service
from signsafe.schemas.document import AnalysisResult
from signsafe.services.analysis_service import AnalysisService
from signsafe.services.pdf_service import PDFService

router = APIRouter(tags=["analyze"])


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    industry: str | None = Form(default=None),
    consent_version: str | None = Form(default=None),
    pdf_service: PDFService = Depends(get_pdf_service),
    analysis_service: AnalysisService = Depends(get_analysis_service),
) -> EventSourceResponse:
    # 152-ФЗ: a valid, versioned consent is required (validated, never stored).
    if not consent_version:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "consent_required",
                "message": "Требуется согласие на обработку данных перед анализом.",
            },
        )
    if consent_version not in settings.accepted_consent_versions:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "consent_version_unknown",
                "message": "Версия согласия не распознана. Обновите страницу и повторите.",
            },
        )

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={"code": "not_pdf", "message": "Поддерживаются только файлы PDF."},
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "file_too_large",
                "message": f"Файл превышает лимит {settings.max_upload_mb} МБ.",
            },
        )

    try:
        pdf_bytes = await file.read()
    except Exception as exc:
        logger.error("Failed to read upload: {}", exc)
        raise HTTPException(
            status_code=400,
            detail={"code": "read_failed", "message": "Не удалось прочитать файл."},
        ) from exc

    if len(pdf_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "file_too_large",
                "message": f"Файл превышает лимит {settings.max_upload_mb} МБ.",
            },
        )

    filename = file.filename

    async def event_generator():
        try:
            yield json.dumps({"stage": "extracting", "progress": 10, "message": "Reading PDF pages..."})
            extracted = pdf_service.extract(pdf_bytes)

            ocr_suffix = " (OCR used)" if extracted.used_ocr else ""
            yield json.dumps({
                "stage": "analyzing",
                "progress": 30,
                "message": f"Running forensics on {extracted.num_pages} pages{ocr_suffix}...",
            })

            outcome = await analysis_service.analyze(extracted, industry=industry)

            # Typed non-analysis outcomes (deprecated preset / not-a-contract): a clean
            # RU message, never a fabricated analysis.
            if not isinstance(outcome.result, AnalysisResult):
                yield json.dumps({
                    "stage": "blocked",
                    "progress": 100,
                    "data": outcome.result.model_dump(),
                })
                return

            yield json.dumps({
                "stage": "done",
                "progress": 100,
                "message": "Analysis complete",
                "data": {
                    "filename": filename,
                    "num_pages": extracted.num_pages,
                    "industry": industry,
                    "used_ocr": extracted.used_ocr,
                    "ocr_quality_low": outcome.ocr_quality_low,
                    "redacted_categories": outcome.redacted_categories,
                    "extracted_pages": [
                        {"page_number": p.page_number, "text": p.text}
                        for p in extracted.pages
                    ],
                    **outcome.result.model_dump(),
                },
            })
        except ValueError as exc:
            yield json.dumps({"stage": "error", "progress": 0, "message": str(exc)})
        except Exception as exc:
            logger.error("Analysis failed: {}", exc)
            yield json.dumps({
                "stage": "error",
                "progress": 0,
                "message": f"Analysis failed: {type(exc).__name__}",
            })

    return EventSourceResponse(event_generator())
