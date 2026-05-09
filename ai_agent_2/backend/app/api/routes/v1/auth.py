"""Authentication routes (JWT-only, no DB session tracking).

Without ``enable_session_management`` we issue access + refresh JWTs and
validate refresh by JWT signature + type claim. The trade-off vs. session
tracking: no per-device list, no remote logout / revocation. ``logout`` is a
no-op on the server — clients drop their tokens.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, UserSvc
from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.schemas.password_reset import (
    MagicLinkRequest,
    MagicLinkVerifyRequest,
    PasswordResetConfirm,
    PasswordResetConfirmResponse,
    PasswordResetRequest,
    PasswordResetResponse,
)
from app.schemas.token import RefreshTokenRequest, Token
from app.schemas.user import UserCreate, UserRead

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    user_service: UserSvc,
) -> Any:
    """OAuth2 compatible token login. Returns access + refresh JWT pair."""
    user = await user_service.authenticate(form_data.username, form_data.password)
    return Token(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    user_service: UserSvc,
) -> Any:
    """Register a new user."""
    return await user_service.register(user_in)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    body: RefreshTokenRequest,
    user_service: UserSvc,
) -> Any:
    """Validate the refresh JWT and issue a new access + refresh pair."""
    payload = verify_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationError(message="Invalid or expired refresh token")
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError(message="Invalid refresh token")
    user = await user_service.get_by_id(user_id)
    if not user.is_active:
        raise AuthenticationError(message="User account is disabled")
    return Token(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def logout(body: RefreshTokenRequest) -> None:
    """No-op without session tracking. Clients drop their JWTs locally."""
    return None


@router.get("/me", response_model=UserRead)
async def get_current_user_info(current_user: CurrentUser) -> Any:
    """Get current authenticated user information."""
    return current_user


# --- Password reset (forgot password) ----------------------------------


@router.post("/password-reset/request", response_model=PasswordResetResponse)
async def request_password_reset(
    body: PasswordResetRequest,
    user_service: UserSvc,
) -> Any:
    """Email a single-use reset link. Returns 200 regardless of email existence
    to prevent account enumeration."""
    issued = await user_service.issue_password_reset_token(body.email)
    if issued is not None:
        _user, token = issued
        try:
            from app.services.email.service import get_email_service

            email = get_email_service()
            reset_url = f"/reset-password?token={token}"
            await email.send_password_reset(
                to=body.email, name=_user.full_name or body.email, reset_url=reset_url
            )
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "password_reset_email_failed", extra={"email": body.email}
            )
    return PasswordResetResponse()


@router.post("/password-reset/confirm", response_model=PasswordResetConfirmResponse)
async def confirm_password_reset(
    body: PasswordResetConfirm,
    user_service: UserSvc,
) -> Any:
    """Set a new password using a token from the reset email."""
    await user_service.confirm_password_reset(body.token, body.new_password)
    return PasswordResetConfirmResponse()


# --- Magic-link sign-in ------------------------------------------------


@router.post("/magic-link/request", response_model=PasswordResetResponse)
async def request_magic_link(
    body: MagicLinkRequest,
    user_service: UserSvc,
) -> Any:
    """Email a single-use sign-in link. Symmetric response to password-reset
    to prevent enumeration."""
    issued = await user_service.issue_magic_link_token(body.email)
    if issued is not None:
        _user, token = issued
        try:
            from app.services.email.service import get_email_service

            email = get_email_service()
            login_url = f"/auth/magic-link?token={token}"
            await email.send_welcome(
                to=body.email, name=_user.full_name or body.email, login_url=login_url
            )
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "magic_link_email_failed", extra={"email": body.email}
            )
    return PasswordResetResponse(message="Check your email for a sign-in link.")


@router.post("/magic-link/verify", response_model=Token)
async def verify_magic_link(
    body: MagicLinkVerifyRequest,
    user_service: UserSvc,
) -> Any:
    """Exchange a magic-link token for an access + refresh JWT pair."""
    user = await user_service.consume_magic_link_token(body.token)
    return Token(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )
