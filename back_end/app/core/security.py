import hashlib
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings


def _decode(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.InvalidTokenError:
        return None


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
    payload = _decode(token)
    if payload is None:
        return None
    # typ이 있으면 다른 용도(OAuth state·메일 링크 등)의 토큰 → API 인증에 사용 불가
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
    payload = _decode(token)
    if payload is None or payload.get("typ") != _STATE_TOKEN_TYP:
        return None
    return payload.get("next", "/")


# ─────────────── 메일 링크 토큰 (이메일 인증 / 비밀번호 재설정) ───────────────
# state 토큰과 같은 stateless 방식. typ 구분 덕에 API 인증(access token)으로는 못 쓴다.
_EMAIL_VERIFY_TYP = "email_verify"
_EMAIL_VERIFY_EXPIRE_HOURS = 24
_PASSWORD_RESET_TYP = "password_reset"
_PASSWORD_RESET_EXPIRE_MINUTES = 30


def create_email_verify_token(user_id: str) -> str:
    expire = datetime.now(UTC) + timedelta(hours=_EMAIL_VERIFY_EXPIRE_HOURS)
    payload = {"typ": _EMAIL_VERIFY_TYP, "sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_email_verify_token(token: str) -> str | None:
    """유효하면 user id 반환, 아니면 None."""
    payload = _decode(token)
    if payload is None or payload.get("typ") != _EMAIL_VERIFY_TYP:
        return None
    return payload.get("sub")


def password_fingerprint(hashed_password: str | None) -> str:
    """현재 비밀번호 해시의 지문. 재설정 토큰에 넣어 두면 비밀번호가 바뀌는 순간
    지문이 달라져 이전 토큰이 전부 무효가 된다 → DB 저장 없이 일회용 토큰."""
    return hashlib.sha256((hashed_password or "").encode("utf-8")).hexdigest()[:16]


def create_password_reset_token(user_id: str, hashed_password: str | None) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=_PASSWORD_RESET_EXPIRE_MINUTES)
    payload = {
        "typ": _PASSWORD_RESET_TYP,
        "sub": user_id,
        "pwd": password_fingerprint(hashed_password),
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_password_reset_token(token: str) -> tuple[str, str] | None:
    """유효하면 (user id, 발급 시점의 비밀번호 지문) 반환, 아니면 None."""
    payload = _decode(token)
    if payload is None or payload.get("typ") != _PASSWORD_RESET_TYP:
        return None
    sub, pwd = payload.get("sub"), payload.get("pwd")
    if not isinstance(sub, str) or not isinstance(pwd, str):
        return None
    return sub, pwd
