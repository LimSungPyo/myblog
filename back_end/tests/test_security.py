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


def test_token_roundtrip():
    token = create_access_token("alice")
    assert decode_access_token(token) == "alice"


def test_tampered_token_rejected():
    token = create_access_token("alice")
    assert decode_access_token(token + "tampered") is None


def test_garbage_token_rejected():
    assert decode_access_token("not-a-real-token") is None
