"""User-scoped API key model.

Each user can mint multiple long-lived tokens for machine-to-machine API
access. The full token is shown once on creation; only its bcrypt hash + the
first 6 characters (the "prefix") are persisted, so revoke is the only
recovery path if the token is lost.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.db.models.user import User


class ApiKey(Base, TimestampMixin):
    """A long-lived authentication token issued to a single user."""

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Bcrypt hash of the full token; never decryptable.
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    # First 6 chars of the token (after the "sk_" sentinel) — purely for UX
    # disambiguation in the management UI.
    prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    user: Mapped["User"] = relationship("User", lazy="joined")

    def __repr__(self) -> str:
        return f"<ApiKey(id={self.id}, user_id={self.user_id}, name={self.name!r})>"
