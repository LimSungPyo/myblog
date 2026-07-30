"""Google OAuth 콜백 흐름 테스트.

외부 통신(fetch_user_info)만 목킹하고, 계정 찾기/생성/연결 로직은 실제로 돌린다.
"""

from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.oauth import OAuthProvider, OAuthUserInfo
from app.core.security import create_state_token
from app.models import SocialAccount, User


@pytest.fixture
def google_configured(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-client-secret")


def mock_user_info(monkeypatch, **overrides):
    info = OAuthUserInfo(
        provider="google",
        provider_user_id=overrides.get("provider_user_id", "google-sub-1"),
        email=overrides.get("email", "user@gmail.com"),
        email_verified=overrides.get("email_verified", True),
        name=overrides.get("name", "구글사용자"),
        picture=overrides.get("picture", "https://example.com/p.png"),
    )
    monkeypatch.setattr(
        OAuthProvider, "fetch_user_info", lambda self, code: info, raising=True
    )
    return info


def callback_fragment(response) -> dict[str, str]:
    fragment = urlparse(response.headers["location"]).fragment
    return {k: v[0] for k, v in parse_qs(fragment).items()}


# ─────────────── 라우트 가드 ───────────────
def test_unknown_provider_404(client, google_configured):
    assert client.get("/auth/kakao/login", follow_redirects=False).status_code == 404


def test_unconfigured_provider_503(client):
    assert client.get("/auth/google/login", follow_redirects=False).status_code == 503


def test_login_redirects_to_google(client, google_configured):
    r = client.get("/auth/google/login?next=/posts", follow_redirects=False)
    assert r.status_code == 302
    url = urlparse(r.headers["location"])
    assert url.hostname == "accounts.google.com"
    q = {k: v[0] for k, v in parse_qs(url.query).items()}
    assert q["client_id"] == "test-client-id"
    assert q["state"]


def test_callback_invalid_state_400(client, google_configured):
    r = client.get(
        "/auth/google/callback?code=abc&state=garbage", follow_redirects=False
    )
    assert r.status_code == 400


def test_callback_user_denied_redirects_with_error(client, google_configured):
    state = create_state_token("/")
    r = client.get(
        f"/auth/google/callback?error=access_denied&state={state}",
        follow_redirects=False,
    )
    assert r.status_code == 302
    assert callback_fragment(r)["error"] == "access_denied"


# ─────────────── 계정 생성/연결 규칙 ───────────────
def test_callback_creates_new_user(client, db_session, google_configured, monkeypatch):
    mock_user_info(monkeypatch)
    state = create_state_token("/posts")
    r = client.get(
        f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
    )
    assert r.status_code == 302
    frag = callback_fragment(r)
    assert frag["isAdmin"] == "0"
    assert frag["next"] == "/posts"

    user = db_session.scalar(select(User).where(User.email == "user@gmail.com"))
    assert user is not None
    assert user.email_verified is True
    assert user.hashed_password is None
    assert user.display_name == "구글사용자"
    # 발급된 토큰으로 인증 가능
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {frag['token']}"})
    assert me.status_code == 200


def test_callback_same_social_account_logs_in_same_user(
    client, db_session, google_configured, monkeypatch
):
    mock_user_info(monkeypatch)
    for _ in range(2):
        state = create_state_token("/")
        r = client.get(
            f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
        )
        assert r.status_code == 302
    assert len(db_session.scalars(select(User)).all()) == 1
    assert len(db_session.scalars(select(SocialAccount)).all()) == 1


def test_callback_links_to_existing_email_account(
    client, db_session, google_configured, monkeypatch
):
    """이메일 가입자가 같은 이메일(검증됨)의 Google로 로그인 → 계정 중복 생성 없이 연결."""
    signup = client.post(
        "/auth/signup",
        json={
            "email": "same@gmail.com",
            "password": "pass12345",
            "displayName": "기존회원",
        },
    )
    assert signup.status_code == 201

    mock_user_info(monkeypatch, email="Same@Gmail.com", email_verified=True)
    state = create_state_token("/")
    r = client.get(
        f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
    )
    assert r.status_code == 302

    users = db_session.scalars(select(User)).all()
    assert len(users) == 1
    user = users[0]
    assert user.email_verified is True
    assert user.hashed_password is not None  # 기존 비밀번호 유지
    account = db_session.scalar(select(SocialAccount))
    assert account.user_id == user.id


def test_callback_unverified_email_creates_separate_user(
    client, db_session, google_configured, monkeypatch
):
    """미검증 이메일은 소유 증명이 없으므로 기존 계정에 연결하지 않는다."""
    client.post(
        "/auth/signup",
        json={
            "email": "victim@gmail.com",
            "password": "pass12345",
            "displayName": "기존회원",
        },
    )
    mock_user_info(monkeypatch, email="victim@gmail.com", email_verified=False)
    state = create_state_token("/")
    r = client.get(
        f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
    )
    assert r.status_code == 302

    users = db_session.scalars(select(User)).all()
    assert len(users) == 2
    social_user = db_session.scalar(select(User).where(User.hashed_password.is_(None)))
    assert social_user.email is None  # 미검증 이메일은 저장하지 않음


def test_state_token_cannot_be_used_as_access_token(client, google_configured):
    state = create_state_token("/")
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {state}"})
    assert r.status_code == 401
