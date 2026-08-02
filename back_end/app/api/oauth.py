import logging
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.oauth import PROVIDERS, OAuthProvider, OAuthUserInfo
from app.core.security import (
    create_access_token,
    create_state_token,
    verify_state_token,
)
from app.db.session import get_db
from app.models import SocialAccount, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_provider(provider: str) -> OAuthProvider:
    p = PROVIDERS.get(provider)
    if p is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="지원하지 않는 로그인 제공자입니다.",
        )
    if not p.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="소셜 로그인이 설정되지 않았습니다.",
        )
    return p


def _safe_next(path: str | None) -> str:
    """내부 경로만 허용 (open redirect 방지). //host 형태도 외부 이동이라 차단."""
    if path and path.startswith("/") and not path.startswith("//"):
        return path
    return "/"


def _frontend_origin() -> str:
    # 다중 오리진 설정 시 첫 항목이 대표(공개) 오리진이라는 관례를 따른다
    return settings.cors_origins[0]


def _get_or_create_user(db: Session, info: OAuthUserInfo) -> User:
    """소셜 프로필로 사용자를 찾거나 만든다. 같은 사람의 중복 계정 생성을 막는 핵심.

    1) 이미 연결된 소셜 계정이면 그 사용자로 로그인
    2) 제공자가 이메일 소유를 검증한 경우에만 같은 이메일 기존 계정에 자동 연결
    3) 그 외에는 신규 사용자 생성 (미검증 이메일은 저장하지 않음)
    """
    account = db.scalar(
        select(SocialAccount).where(
            SocialAccount.provider == info.provider,
            SocialAccount.provider_user_id == info.provider_user_id,
        )
    )
    if account is not None:
        return db.get(User, account.user_id)

    email = info.email.lower() if info.email else None
    verified = bool(email and info.email_verified)

    user = db.scalar(select(User).where(User.email == email)) if verified else None
    if user is not None:
        logger.info(
            "social link: %s account linked to existing user %s", info.provider, user.id
        )
        if not user.email_verified and user.hashed_password is not None:
            # 선점 가입 방어: 메일 인증을 거치지 않은 비밀번호는 이메일 소유가 증명된 적 없는
            # 값이다. 지금 이 사람(Google이 이메일 소유를 확인해준)이 진짜 주인이므로,
            # 먼저 가입해둔 누군가의 비밀번호가 이 계정에 남지 않도록 폐기한다.
            user.hashed_password = None
            logger.info(
                "social link: unverified password discarded for user %s", user.id
            )
        user.email_verified = True
        if not user.avatar_url and info.picture:
            user.avatar_url = info.picture
    else:
        user = User(
            email=email if verified else None,
            email_verified=verified,
            display_name=(info.name or email or f"{info.provider} 사용자")[:80],
            avatar_url=info.picture,
        )
        db.add(user)
        db.flush()

    db.add(
        SocialAccount(
            user_id=user.id,
            provider=info.provider,
            provider_user_id=info.provider_user_id,
            provider_email=email,
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("/{provider}/login")
def oauth_login(provider: str, next: str = "/") -> RedirectResponse:
    p = _get_provider(provider)
    state = create_state_token(_safe_next(next))
    return RedirectResponse(
        p.authorize_redirect_url(state), status_code=status.HTTP_302_FOUND
    )


@router.get("/{provider}/callback")
def oauth_callback(
    provider: str,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    p = _get_provider(provider)
    frontend = _frontend_origin()

    next_path = verify_state_token(state) if state else None
    if next_path is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 state입니다.",
        )

    # 사용자가 동의 화면에서 취소했거나 제공자가 에러를 반환한 경우
    if error or not code:
        return RedirectResponse(
            f"{frontend}/auth/callback#error={quote(error or 'access_denied')}",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        info = p.fetch_user_info(code)
    except httpx.HTTPError:
        logger.exception("oauth: %s user info fetch failed", provider)
        return RedirectResponse(
            f"{frontend}/auth/callback#error=provider_error",
            status_code=status.HTTP_302_FOUND,
        )

    user = _get_or_create_user(db, info)
    token = create_access_token(subject=str(user.id))
    # 토큰은 query가 아닌 fragment로 전달 → 서버 로그·Referer에 남지 않음
    fragment = urlencode(
        {"token": token, "isAdmin": "1" if user.is_admin else "0", "next": next_path}
    )
    return RedirectResponse(
        f"{frontend}/auth/callback#{fragment}", status_code=status.HTTP_302_FOUND
    )
