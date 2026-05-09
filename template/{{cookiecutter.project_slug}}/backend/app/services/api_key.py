"""User-scoped API key business logic.

Tokens are 32-byte URL-safe random strings, prefixed with `sk_` for visual
identification. Storage is bcrypt-hashed — we never persist the plain token.

Token format:  sk_<43 url-safe chars>
                ^^ prefix shown in management UI (first 6 chars after sk_)
"""

from __future__ import annotations

import secrets
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import get_password_hash, verify_password
from app.db.models.api_key import ApiKey
from app.repositories import api_key as api_key_repo

TOKEN_PREFIX = "sk_"
PREFIX_LENGTH = 6  # chars after "sk_" exposed as `prefix` for UX


def _generate_token() -> tuple[str, str]:
    """Return (full_token, prefix). Prefix is the first 6 chars after `sk_`."""
    body = secrets.token_urlsafe(32)
    full = f"{TOKEN_PREFIX}{body}"
    return full, body[:PREFIX_LENGTH]


class ApiKeyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_key(self, *, user_id: UUID, name: str) -> tuple[ApiKey, str]:
        """Mint a new key. Returns (db_row, plain_token).

        The plain token is shown to the user once and never persisted.
        """
        token, prefix = _generate_token()
        key_hash = get_password_hash(token)
        db_key = await api_key_repo.create(
            self.db,
            user_id=user_id,
            name=name.strip(),
            key_hash=key_hash,
            prefix=prefix,
        )
        return db_key, token

    async def list_keys(self, *, user_id: UUID) -> tuple[list[ApiKey], int]:
        return await api_key_repo.list_for_user(self.db, user_id=user_id)

    async def revoke_key(self, *, user_id: UUID, key_id: UUID) -> ApiKey:
        db_key = await api_key_repo.get_by_id(self.db, key_id)
        if db_key is None or db_key.user_id != user_id:
            # Hide existence from non-owners.
            raise NotFoundError(
                message="API key not found",
                details={"key_id": str(key_id)},
            )
        if db_key.revoked_at is not None:
            return db_key
        return await api_key_repo.revoke(self.db, db_key=db_key)

    async def verify(self, token: str) -> ApiKey | None:
        """Resolve a plain token to its key row, or None.

        Iterates user-scoped tokens — fine for typical fleet sizes (<10k keys).
        For larger deployments, switch to a deterministic prefix lookup.
        """
        if not token.startswith(TOKEN_PREFIX):
            return None
        # We can't query by hash directly (bcrypt salts differ); narrow by
        # prefix and compare hashes.
        body = token[len(TOKEN_PREFIX) :]
        if len(body) < PREFIX_LENGTH:
            return None
        prefix = body[:PREFIX_LENGTH]
        candidates = await api_key_repo.list_active_by_prefix(self.db, prefix=prefix)
        for candidate in candidates:
            if verify_password(token, candidate.key_hash):
                await api_key_repo.touch_last_used(self.db, db_key=candidate)
                return candidate
        return None
