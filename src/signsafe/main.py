"""SignSafe FastAPI app factory — stateless analysis + zero-knowledge sync."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi.errors import RateLimitExceeded
from starlette.formparsers import MultiPartParser

from signsafe.api import documents, health, negotiation, sync
from signsafe.core.body_limit import BodySizeLimitMiddleware
from signsafe.core.config import settings
from signsafe.core.database import close_db, init_db
from signsafe.core.rate_limit import limiter

# Keep uploads in memory instead of letting starlette spool them to a temp file on disk.
#
# VERIFIED (starlette 1.0.0): MultiPartParser.spool_max_size defaults to 1 MiB; above it
# SpooledTemporaryFile.rollover() writes the upload to a real (anonymous) temp file. Since
# the handler reads the whole PDF into memory anyway and rejects anything over
# max_upload_mb, spooling to disk buys nothing — raising the threshold to the upload limit
# makes "the PDF is never written to disk" actually TRUE for every accepted upload.
MultiPartParser.spool_max_size = settings.max_upload_bytes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("SignSafe started (stateless analysis + zero-knowledge sync)")
    yield
    await close_db()


app = FastAPI(
    title="SignSafe",
    description="Экспериментальный разбор договора найма (бета) — stateless, без хранения",
    version="0.4.0",
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": {
                "code": "rate_limited",
                "message": "Слишком много запросов. Подождите минуту и попробуйте снова.",
            }
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added LAST so it runs FIRST (Starlette applies middleware outermost-last): the body
# must be size-checked before the multipart parser buffers it into memory.
# NOTE: this is not a hard bound by itself — see core/body_limit.py for the Caddy
# directive that is still required at the edge.
app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_upload_bytes)

app.include_router(health.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(negotiation.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
# NOTE: there is deliberately no /api/translate router. The translation capability was
# removed in the RU-first beta: it was a public endpoint that forwarded arbitrary caller
# strings to Google Translate, which made "OpenRouter is the only third party that
# receives anything from your document" false. See services/outbound.py.
