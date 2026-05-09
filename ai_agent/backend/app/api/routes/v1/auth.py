"""Authentication routes."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, SessionSvc, UserSvc
from app.core.exceptions import AuthenticationError
from app.core.security import create_access_token, create_refresh_token
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
    session_service: SessionSvc,
) -> Any:
    """OAuth2 compatible token login.

    Returns access token and refresh token.
    Raises domain exceptions handled by exception handlers.
    """
    user = await user_service.authenticate(form_data.username, form_data.password)
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    # Create session to track this login
    await session_service.create_session(
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    user_service: UserSvc,
) -> Any:
    """Register a new user.

    Raises AlreadyExistsError if email is already registered.
    """
    user = await user_service.register(user_in)
    return user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    body: RefreshTokenRequest,
    user_service: UserSvc,
    session_service: SessionSvc,
) -> Any:
    """Get new access token using refresh token.

    Raises AuthenticationError if refresh token is invalid or expired.
    """

    # Validate refresh token against stored session
    session = await session_service.validate_refresh_token(body.refresh_token)
    if not session:
        raise AuthenticationError(message="Invalid or expired refresh token")

    user = await user_service.get_by_id(session.user_id)
    if not user.is_active:
        raise AuthenticationError(message="User account is disabled")

    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))

    # Invalidate old session and create new one
    await session_service.logout_by_refresh_token(body.refresh_token)
    await session_service.create_session(
        user_id=user.id,
        refresh_token=new_refresh_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def logout(
    body: RefreshTokenRequest,
    session_service: SessionSvc,
) -> None:
    """Logout and invalidate the current session.

    Invalidates the refresh token, preventing further token refresh.
    """
    await session_service.logout_by_refresh_token(body.refresh_token)


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
    """Email a single-use reset link to the address.

    Always returns 200 with the same body — we don't disclose whether the
    email is in our system. The caller (email service) is best-effort.
    """
    issued = await user_service.issue_password_reset_token(body.email)
    if issued is not None:
        _user, token = issued
        # Best-effort email — failure here is logged but doesn't change the
        # response so we never leak account existence.
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
    """Email a single-use sign-in link.

    Symmetric response to request_password_reset to avoid email enumeration.
    """
    issued = await user_service.issue_magic_link_token(body.email)
    if issued is not None:
        _user, token = issued
        try:
            from app.services.email.service import get_email_service

            email = get_email_service()
            login_url = f"/auth/magic-link?token={token}"
            # Reuse send_welcome shape; a dedicated `send_magic_link` template
            # can replace this if richer copy is desired.
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
    request: Request,
    body: MagicLinkVerifyRequest,
    user_service: UserSvc,
    session_service: SessionSvc,
) -> Any:
    """Exchange a magic-link token for an access + refresh token pair."""
    user = await user_service.consume_magic_link_token(body.token)
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    await session_service.create_session(
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    return Token(access_token=access_token, refresh_token=refresh_token)
