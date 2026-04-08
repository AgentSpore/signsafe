"""Stateless analyze endpoint — upload PDF and stream results via SSE."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from loguru import logger
from sse_starlette.sse import EventSourceResponse

from signsafe.core.config import settings
from signsafe.core.deps import get_analysis_service, get_pdf_service
from signsafe.services.analysis_service import AnalysisService
from signsafe.services.pdf_service import PDFService

router = APIRouter(tags=["analyze"])


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    industry: str | None = Form(default=None),
    pdf_service: PDFService = Depends(get_pdf_service),
    analysis_service: AnalysisService = Depends(get_analysis_service),
) -> EventSourceResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb}MB limit")

    try:
        pdf_bytes = await file.read()
    except Exception as exc:
        logger.error("Failed to read upload: {}", exc)
        raise HTTPException(status_code=400, detail="Failed to read file") from exc

    if len(pdf_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb}MB limit")

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

            analysis = await analysis_service.analyze(extracted, industry=industry)

            yield json.dumps({
                "stage": "done",
                "progress": 100,
                "message": "Analysis complete",
                "data": {
                    "filename": filename,
                    "num_pages": extracted.num_pages,
                    "industry": industry,
                    "used_ocr": extracted.used_ocr,
                    **analysis.model_dump(),
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
