"""SignSafe FastAPI app factory — stateless analysis + zero-knowledge sync."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from signsafe.api import documents, health, negotiation, sync, translate
from signsafe.core.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("SignSafe started (stateless analysis + zero-knowledge sync)")
    yield
    await close_db()


app = FastAPI(
    title="SignSafe",
    description="Stateless AI lease forensics for first-time commercial tenants",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(negotiation.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
