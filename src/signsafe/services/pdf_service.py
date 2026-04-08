"""PDF text extraction with OCR fallback."""

from __future__ import annotations

from dataclasses import dataclass

import pymupdf
from loguru import logger

try:
    import pytesseract
    from PIL import Image
    _HAS_OCR = True
except ImportError:
    _HAS_OCR = False

MIN_TEXT_CHARS = 100
OCR_DPI = 200


@dataclass
class PageText:
    page_number: int
    text: str


@dataclass
class ExtractedDocument:
    num_pages: int
    pages: list[PageText]
    used_ocr: bool = False

    @property
    def full_text(self) -> str:
        return "\n\n".join(f"[PAGE {p.page_number}]\n{p.text}" for p in self.pages)

    @property
    def total_chars(self) -> int:
        return sum(len(p.text) for p in self.pages)


class PDFService:
    """Extract text from PDF leases with OCR fallback for scanned documents."""

    def extract(self, pdf_bytes: bytes) -> ExtractedDocument:
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            logger.error("Failed to open PDF: {}", exc)
            raise ValueError("Invalid PDF file") from exc

        pages: list[PageText] = []
        try:
            for idx, page in enumerate(doc, start=1):
                text = (page.get_text("text") or "").strip()
                pages.append(PageText(page_number=idx, text=text))
        finally:
            pass  # keep doc open for OCR fallback

        total_chars = sum(len(p.text) for p in pages)
        used_ocr = False

        if total_chars < MIN_TEXT_CHARS and len(pages) > 0:
            logger.info("Low text yield ({}), triggering OCR fallback", total_chars)
            if not _HAS_OCR:
                doc.close()
                raise ValueError(
                    "Scanned PDF detected but OCR not available. "
                    "Install pytesseract + tesseract binary to enable OCR."
                )
            pages = self._ocr_pages(doc)
            used_ocr = True

        doc.close()

        logger.info(
            "Extracted {} pages from PDF ({} chars{})",
            len(pages),
            sum(len(p.text) for p in pages),
            " via OCR" if used_ocr else "",
        )
        return ExtractedDocument(num_pages=len(pages), pages=pages, used_ocr=used_ocr)

    def _ocr_pages(self, doc: "pymupdf.Document") -> list[PageText]:
        import io

        results: list[PageText] = []
        zoom = OCR_DPI / 72.0
        matrix = pymupdf.Matrix(zoom, zoom)
        for idx, page in enumerate(doc, start=1):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            try:
                text = pytesseract.image_to_string(image).strip()
            except Exception as exc:
                logger.error("OCR failed on page {}: {}", idx, exc)
                text = ""
            results.append(PageText(page_number=idx, text=text))
            logger.debug("OCR page {}: {} chars", idx, len(text))
        return results
