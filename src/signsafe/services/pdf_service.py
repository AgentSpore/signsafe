"""PDF text extraction with OCR fallback."""

from __future__ import annotations

import io
import time
from dataclasses import dataclass

import pymupdf
from loguru import logger

from signsafe.core.config import settings
from signsafe.core.errors import UserMessageError

try:
    # Optional OCR stack — guarded so the app runs without the tesseract binding present.
    import pytesseract  # noqa: PLC0415 (optional-dependency guard, not a cycle)
    from PIL import Image  # noqa: PLC0415 (optional-dependency guard, not a cycle)
    _HAS_OCR = True
except ImportError:
    _HAS_OCR = False

MIN_TEXT_CHARS = 100
OCR_DPI = 200
# OCR language: Russian + English (RU v1). Falls back handled by tesseract.
OCR_LANG = "rus+eng"
# Decompression-bomb guard: reject a single rendered page larger than this (pixels).
# A 40-page A4 doc at 200 DPI renders ~3.9 MP/page; 25 MP is a generous ceiling.
MAX_OCR_PIXELS = 25_000_000
# OCR is considered low-quality if it yields fewer than this many chars per page.
MIN_OCR_CHARS_PER_PAGE = 40

_TIMEOUT_MSG = (
    "Обработка документа заняла слишком много времени. "
    "Загрузите документ меньшего объёма или с текстовым слоем."
)


@dataclass
class PageText:
    page_number: int
    text: str


@dataclass
class ExtractedDocument:
    num_pages: int
    pages: list[PageText]
    used_ocr: bool = False
    # True when OCR ran but produced suspiciously little text (poor scan quality) —
    # surfaced as a warning in the result so the reader can re-upload a clearer scan.
    ocr_quality_low: bool = False

    @property
    def full_text(self) -> str:
        return "\n\n".join(f"[PAGE {p.page_number}]\n{p.text}" for p in self.pages)

    @property
    def total_chars(self) -> int:
        return sum(len(p.text) for p in self.pages)


class PDFService:
    """Extract text from PDF leases with OCR fallback for scanned documents."""

    def extract(self, pdf_bytes: bytes) -> ExtractedDocument:
        # Total wall-clock budget for this document (per-page OCR timeouts alone are not
        # a bound: max_pdf_pages x ocr_timeout_seconds would pin a worker for ~40 min).
        deadline = time.monotonic() + settings.max_extraction_seconds
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            logger.error("Failed to open PDF: {}", type(exc).__name__)
            raise UserMessageError("Не удалось открыть PDF-файл — возможно, он повреждён.") from exc

        # Page-count limit (resource control): reject oversized documents up front.
        if doc.page_count > settings.max_pdf_pages:
            page_count = doc.page_count
            doc.close()
            raise UserMessageError(
                f"В документе {page_count} страниц — превышен лимит "
                f"{settings.max_pdf_pages}. Загрузите документ меньшего объёма."
            )

        pages: list[PageText] = []
        try:
            for idx, page in enumerate(doc, start=1):
                text = (page.get_text("text") or "").strip()
                pages.append(PageText(page_number=idx, text=text))
        finally:
            pass  # keep doc open for OCR fallback

        total_chars = sum(len(p.text) for p in pages)
        used_ocr = False
        ocr_quality_low = False

        if total_chars < MIN_TEXT_CHARS and pages:
            logger.info("Low text yield ({}), triggering OCR fallback", total_chars)
            if not _HAS_OCR:
                doc.close()
                raise UserMessageError(
                    "Похоже, это скан без текстового слоя, а модуль распознавания "
                    "(OCR) недоступен. Загрузите PDF с текстовым слоем."
                )
            try:
                pages = self._ocr_pages(doc, deadline)
            except UserMessageError:
                doc.close()
                raise
            used_ocr = True
            ocr_chars = sum(len(p.text) for p in pages)
            ocr_quality_low = ocr_chars < MIN_OCR_CHARS_PER_PAGE * len(pages)

        doc.close()

        logger.info(
            "Extracted {} pages from PDF ({} chars{})",
            len(pages),
            sum(len(p.text) for p in pages),
            " via OCR" if used_ocr else "",
        )
        return ExtractedDocument(
            num_pages=len(pages),
            pages=pages,
            used_ocr=used_ocr,
            ocr_quality_low=ocr_quality_low,
        )

    def _ocr_pages(self, doc: "pymupdf.Document", deadline: float) -> list[PageText]:
        results: list[PageText] = []
        zoom = OCR_DPI / 72.0
        matrix = pymupdf.Matrix(zoom, zoom)
        for idx, page in enumerate(doc, start=1):
            if time.monotonic() >= deadline:
                raise UserMessageError(_TIMEOUT_MSG)
            # Decompression-bomb guard: estimate the rendered size from the page geometry
            # BEFORE get_pixmap allocates the bitmap — checking afterwards does not
            # prevent the allocation it is supposed to guard against.
            rect = page.rect
            est_pixels = (rect.width * zoom) * (rect.height * zoom)
            if est_pixels > MAX_OCR_PIXELS:
                logger.warning(
                    "Page {} would render to ~{:.0f} px — exceeds OCR pixel cap, skipping",
                    idx, est_pixels,
                )
                results.append(PageText(page_number=idx, text=""))
                continue
            # Rendering (pixmap + PNG encode) is itself slow on adversarial pages, so the
            # clock is re-checked after it, not before.
            #
            # HONEST LIMIT — this budget is NOT a hard wall-clock bound. get_pixmap() is a
            # synchronous, uninterruptible C call: once it starts, nothing here can stop
            # it, so a single enormous page can overrun the deadline and we only notice
            # afterwards. What actually bounds the work is the page cap
            # (settings.max_pdf_pages) plus the pixel guard below, which reject the inputs
            # that would make a render pathological. The deadline then bounds the
            # ACCUMULATION across pages. Making the render itself interruptible needs a
            # subprocess with a kill timeout — deliberately not done for the beta.
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise UserMessageError(_TIMEOUT_MSG)
            try:
                # Never let one page outlive the whole-document budget.
                text = pytesseract.image_to_string(
                    image,
                    lang=OCR_LANG,
                    timeout=max(1, int(min(settings.ocr_timeout_seconds, remaining))),
                ).strip()
            except Exception as exc:
                logger.error("OCR failed on page {}: {}", idx, type(exc).__name__)
                text = ""
            results.append(PageText(page_number=idx, text=text))
            logger.debug("OCR page {}: {} chars", idx, len(text))
        return results
