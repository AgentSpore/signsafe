"""Cloud sync DTOs — backend only sees encrypted blobs."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkResponse(BaseModel):
    token: str
    # In dev mode, returned directly. In prod, sent via email.
    dev_mode: bool = True


class ConsumeTokenRequest(BaseModel):
    token: str


class ConsumeTokenResponse(BaseModel):
    email: str
    session_token: str


class SyncPutRequest(BaseModel):
    session_token: str
    ciphertext: str = Field(description="Base64-encoded AES-GCM encrypted JSON blob")
    iv: str = Field(description="Base64-encoded 12-byte IV")


class SyncGetRequest(BaseModel):
    session_token: str


class SyncBlob(BaseModel):
    ciphertext: str | None = None
    iv: str | None = None
    updated_at: str | None = None
