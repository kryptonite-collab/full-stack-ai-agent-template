"""API key schemas — user-scoped tokens for machine-to-machine API access."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, TimestampSchema


class ApiKeyCreate(BaseSchema):
    """Request body for minting a new key."""

    name: str = Field(..., min_length=1, max_length=255, description="Human label")


class ApiKeyRead(BaseSchema, TimestampSchema):
    """Public view of a key — never includes the full token."""

    id: UUID
    name: str
    prefix: str
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None


class ApiKeyCreated(ApiKeyRead):
    """Response from create — includes the full token, shown once."""

    token: str = Field(
        ...,
        description="Full token. Save it now — it's not retrievable later.",
    )


class ApiKeyList(BaseSchema):
    items: list[ApiKeyRead]
    total: int
