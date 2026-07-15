"""FastAPI dependency injection — stateless."""

from __future__ import annotations

from signsafe.services.analysis_service import AnalysisService
from signsafe.services.negotiation_service import NegotiationService
from signsafe.services.pdf_service import PDFService
from signsafe.services.sync_service import SyncService

_pdf = PDFService()
_analysis = AnalysisService()
_negotiation = NegotiationService()
_sync = SyncService()


def get_pdf_service() -> PDFService:
    return _pdf


def get_analysis_service() -> AnalysisService:
    return _analysis


def get_negotiation_service() -> NegotiationService:
    return _negotiation


def get_sync_service() -> SyncService:
    return _sync
