"""User-scoped API key management."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import ApiKeySvc, CurrentUser
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyCreated,
    ApiKeyList,
    ApiKeyRead,
)

router = APIRouter()


@router.get("", response_model=ApiKeyList)
async def list_api_keys(service: ApiKeySvc, user: CurrentUser) -> Any:
    """List all (non-revoked) API keys for the current user."""
    items, total = await service.list_keys(user_id=user.id)
    return ApiKeyList(items=[ApiKeyRead.model_validate(k) for k in items], total=total)


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: ApiKeyCreate,
    service: ApiKeySvc,
    user: CurrentUser,
) -> Any:
    """Mint a new API key. The full token is returned ONCE."""
    db_key, token = await service.create_key(user_id=user.id, name=data.name)
    return ApiKeyCreated(
        id=db_key.id,
        name=db_key.name,
        prefix=db_key.prefix,
        last_used_at=db_key.last_used_at,
        revoked_at=db_key.revoked_at,
        created_at=db_key.created_at,
        updated_at=db_key.updated_at,
        token=token,
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def revoke_api_key(
    key_id: UUID,
    service: ApiKeySvc,
    user: CurrentUser,
) -> Any:
    """Revoke a key. Future requests with that token will fail."""
    await service.revoke_key(user_id=user.id, key_id=key_id)
    return None
