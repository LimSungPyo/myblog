from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("secret")
    assert hashed != "secret"
    assert verify_password("secret", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_none_hash_rejected():
    # 소셜 로그인 전용 계정은 hashed_password가 None
    assert verify_password("secret", None) is False


def test_overlong_password_rejected():
    # bcrypt 72바이트 제한 초과 입력은 예외 대신 False
    hashed = hash_password("secret")
    assert verify_password("a" * 100, hashed) is False


def test_token_roundtrip():
    token = create_access_token("alice")
    assert decode_access_token(token) == "alice"


def test_tampered_token_rejected():
    token = create_access_token("alice")
    assert decode_access_token(token + "tampered") is None


def test_garbage_token_rejected():
    assert decode_access_token("not-a-real-token") is None


def test_expired_token_rejected():
    expired = jwt.encode(
        {"sub": "alice", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    assert decode_access_token(expired) is None
