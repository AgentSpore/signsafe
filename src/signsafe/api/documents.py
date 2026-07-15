"""Stateless analyze endpoint — upload PDF and stream results via SSE."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from loguru import logger
from sse_starlette.sse import EventSourceResponse

from signsafe.core.config import settings
from signsafe.core.deps import get_analysis_service, get_pdf_service
from signsafe.core.errors import UserMessageError
from signsafe.core.rate_limit import limiter
from signsafe.schemas.document import AnalysisResult
from signsafe.services.analysis_service import AnalysisService
from signsafe.services.pdf_service import PDFService

router = APIRouter(tags=["analyze"])


class _UploadBuffer:
    """Holds the uploaded PDF and releases it the moment extraction is done.

    The SSE generator is a closure that outlives extraction: a plain `pdf_bytes` local
    stays referenced for the whole analysis (an LLM round-trip of many seconds), so the
    privacy copy's «освобождается сразу после извлечения текста» would be false. Handing
    the bytes over through this buffer drops our reference at `take()`, leaving only the
    caller's short-lived argument.
    """

    def __init__(self, data: bytes) -> None:
        self._data: bytes | None = data

    def take(self) -> bytes:
        if self._data is None:
            raise RuntimeError("upload buffer already released")
        data = self._data
        self._data = None  # release: this object no longer references the PDF
        return data

    @property
    def released(self) -> bool:
        return self._data is None


@router.post("/analyze")
@limiter.limit(settings.rate_limit_analyze)
async def analyze(
    request: Request,
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
        logger.error("Failed to read upload: {}", type(exc).__name__)
        raise HTTPException(
            status_code=400,
            detail={"code": "read_failed", "message": "Не удалось прочитать файл."},
        ) from exc
    finally:
        # Release the upload buffer immediately after read. Uploads are held in memory
        # (main.py raises spool_max_size above max_upload_bytes), but an oversized upload
        # rejected below may still have spooled to a temp file — close() drops it now
        # rather than at GC time.
        await file.close()

    if len(pdf_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "code": "file_too_large",
                "message": f"Файл превышает лимит {settings.max_upload_mb} МБ.",
            },
        )

    filename = file.filename
    # Hand the bytes to a buffer and drop our own name for them, so the only reference
    # left is the buffer's — released as soon as extraction has consumed it.
    buffer = _UploadBuffer(pdf_bytes)
    del pdf_bytes

    async def event_generator():
        try:
            yield json.dumps({"stage": "extracting", "progress": 10, "message": "Reading PDF pages..."})
            # Extraction + OCR are blocking CPU/subprocess work — never run them on the
            # event loop, or one slow scan stalls every other request on this worker.
            data = buffer.take()
            extracted = await asyncio.to_thread(pdf_service.extract, data)
            # Free the PDF BEFORE the LLM round-trip: `data` is the last reference, and
            # the analysis below takes seconds. This is what makes «освобождается сразу
            # после извлечения текста» true rather than aspirational.
            del data

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
        except UserMessageError as exc:
            # The ONLY exception whose message we may echo: we authored it (a fixed RU
            # string). Note this is deliberately NOT `except ValueError` — pydantic's
            # ValidationError is a ValueError and its message embeds the offending input,
            # which here is model output derived from the contract.
            yield json.dumps({"stage": "error", "progress": 0, "message": str(exc)})
        except Exception as exc:
            # TYPE only. Provider exceptions carry the request body — i.e. the contract
            # text — in their message; logging the value would write document content into
            # logs that persist.
            logger.error("Analysis failed: {}", type(exc).__name__)
            yield json.dumps({
                "stage": "error",
                "progress": 0,
                "message": f"Analysis failed: {type(exc).__name__}",
            })

    return EventSourceResponse(event_generator())
