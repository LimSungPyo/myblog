from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str | None) -> bool:
    # hashed가 None인 경우: 소셜 로그인 전용 계정(비밀번호 미설정)
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        # bcrypt 제한(72바이트) 초과 입력이나 손상된 해시는 실패로 처리
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """유효하면 subject 반환, 아니면 None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.InvalidTokenError:
        return None
    # typ이 있으면 다른 용도(OAuth state 등)의 토큰 → API 인증에 사용 불가
    if payload.get("typ") is not None:
        return None
    return payload.get("sub")


# ─────────────── OAuth state 토큰 ───────────────
# 소셜 로그인 CSRF 방어용. 서버 저장소 없이(stateless) 서명·만료로만 검증한다.
_STATE_TOKEN_TYP = "oauth_state"
_STATE_TOKEN_EXPIRE_MINUTES = 10


def create_state_token(next_path: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=_STATE_TOKEN_EXPIRE_MINUTES)
    payload = {"typ": _STATE_TOKEN_TYP, "next": next_path, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_state_token(token: str) -> str | None:
    """유효하면 로그인 후 이동할 next 경로 반환, 아니면 None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.InvalidTokenError:
        return None
    if payload.get("typ") != _STATE_TOKEN_TYP:
        return None
    return payload.get("next", "/")
