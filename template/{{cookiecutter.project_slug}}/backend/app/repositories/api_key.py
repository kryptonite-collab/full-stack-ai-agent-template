"""Data access for user-scoped API keys."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.api_key import ApiKey


async def create(
    db: AsyncSession,
    *,
    user_id: UUID,
    name: str,
    key_hash: str,
    prefix: str,
) -> ApiKey:
    key = ApiKey(user_id=user_id, name=name, key_hash=key_hash, prefix=prefix)
    db.add(key)
    await db.flush()
    await db.refresh(key)
    return key


async def get_by_id(db: AsyncSession, key_id: UUID) -> ApiKey | None:
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    return result.scalar_one_or_none()


async def get_by_hash(db: AsyncSession, key_hash: str) -> ApiKey | None:
    """Lookup for auth verification. Returns even if revoked — caller checks."""
    result = await db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash))
    return result.scalar_one_or_none()


async def list_active_by_prefix(db: AsyncSession, *, prefix: str) -> list[ApiKey]:
    """Find candidate active keys matching a prefix (for bcrypt verify loop)."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.prefix == prefix,
            ApiKey.revoked_at.is_(None),
        )
    )
    return list(result.scalars())


async def list_for_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    include_revoked: bool = False,
) -> tuple[list[ApiKey], int]:
    stmt = select(ApiKey).where(ApiKey.user_id == user_id)
    if not include_revoked:
        stmt = stmt.where(ApiKey.revoked_at.is_(None))
    stmt = stmt.order_by(ApiKey.created_at.desc())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()
    items = list((await db.execute(stmt)).scalars())
    return items, total


async def revoke(db: AsyncSession, *, db_key: ApiKey) -> ApiKey:
    db_key.revoked_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(db_key)
    return db_key


async def touch_last_used(db: AsyncSession, *, db_key: ApiKey) -> None:
    db_key.last_used_at = datetime.now(UTC)
    await db.flush()
