"""한 계정 한 곳 로그인: 나중에 로그인한 쪽이 이기고, 먼저 있던 쪽은 튕긴다.

로그인 성공 경로(비밀번호 로그인·메일 인증·비밀번호 재설정·구글 로그인)마다
"새로 로그인하면 이전 토큰이 죽는다"를 확인한다. 한 경로라도 빠지면 그 경로로
로그인한 기기는 다른 기기를 쫓아내지 못한다.
"""

from urllib.parse import parse_qs, urlparse

from sqlalchemy import select

from app.core.config import settings
from app.core.login_session import SESSION_REPLACED_MESSAGE
from app.core.oauth import OAuthProvider, OAuthUserInfo
from app.core.security import (
    create_access_token,
    create_email_verify_token,
    create_password_reset_token,
    create_state_token,
    hash_password,
)
from app.models import User


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login(client, username="testuser", password="test1234") -> str:
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200
    return r.json()["accessToken"]


def assert_kicked_out(client, token: str) -> None:
    r = client.get("/auth/me", headers=bearer(token))
    assert r.status_code == 401
    assert r.json()["detail"] == SESSION_REPLACED_MESSAGE
    # 프론트는 문구가 아니라 이 헤더로 "다른 곳에서 로그인"을 알아본다
    assert r.headers["x-auth-reason"] == "session_replaced"


# ─────────────── 비밀번호 로그인 ───────────────
def test_login_token_works(client, regular_user):
    token = login(client)
    assert client.get("/auth/me", headers=bearer(token)).status_code == 200


def test_second_login_kicks_out_first(client, regular_user):
    first = login(client)
    second = login(client)
    assert_kicked_out(client, first)
    assert client.get("/auth/me", headers=bearer(second)).status_code == 200


def test_kicked_token_is_rejected_on_every_protected_api(client, regular_user):
    # 검사는 get_current_user 한 곳에 있어서, 로그인이 필요한 API 전부에 걸린다
    first = login(client)
    login(client)
    r = client.post("/guestbook", data={"content": "안녕"}, headers=bearer(first))
    assert r.status_code == 401
    assert r.headers["x-auth-reason"] == "session_replaced"


def test_admin_is_also_single_session(client, admin_user):
    first = login(client, "admin", "admin1234")
    login(client, "admin", "admin1234")
    assert client.get("/admin/posts", headers=bearer(first)).status_code == 401


def test_failed_login_does_not_kick_out(client, regular_user):
    # 비밀번호를 모르는 사람이 틀린 비밀번호로 시도해서 남을 쫓아낼 수 있으면 안 된다
    token = login(client)
    r = client.post("/auth/login", json={"username": "testuser", "password": "nope"})
    assert r.status_code == 401
    assert client.get("/auth/me", headers=bearer(token)).status_code == 200


def test_other_users_login_does_not_affect(client, regular_user, admin_user):
    token = login(client)
    login(client, "admin", "admin1234")
    assert client.get("/auth/me", headers=bearer(token)).status_code == 200


# ─────────────── 번호가 생기기 전의 토큰 ───────────────
def test_old_token_without_sid_works_until_next_login(client, regular_user):
    # 배포 전에 받은 토큰(번호 없음) + 아직 새로 로그인한 적 없는 계정 → 통과.
    # 배포하는 순간 모두를 튕기지 않으려는 것이다.
    old = create_access_token(str(regular_user.id), None)
    assert client.get("/auth/me", headers=bearer(old)).status_code == 200
    # 한 번이라도 새로 로그인하면 번호 없는 토큰은 끝
    login(client)
    assert_kicked_out(client, old)


def test_forged_sid_rejected(client, regular_user):
    login(client)
    forged = create_access_token(str(regular_user.id), "guess")
    assert client.get("/auth/me", headers=bearer(forged)).status_code == 401


# ─────────────── 다른 로그인 경로 ───────────────
def verified_email_user(db_session) -> User:
    user = User(
        email="multi@example.com",
        hashed_password=hash_password("oldpass123"),
        email_verified=True,
        display_name="회원",
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_verify_email_link_kicks_out_other_device(client, db_session):
    user = verified_email_user(db_session)
    first = login(client, "multi@example.com", "oldpass123")
    r = client.post(
        "/auth/verify-email", json={"token": create_email_verify_token(str(user.id))}
    )
    assert r.status_code == 200
    assert_kicked_out(client, first)
    me = client.get("/auth/me", headers=bearer(r.json()["accessToken"]))
    assert me.status_code == 200


def test_password_reset_kicks_out_every_other_device(client, db_session):
    user = verified_email_user(db_session)
    phone = login(client, "multi@example.com", "oldpass123")
    reset = create_password_reset_token(str(user.id), user.hashed_password)
    r = client.post(
        "/auth/reset-password", json={"token": reset, "password": "newpass123"}
    )
    assert r.status_code == 200
    # 비밀번호가 새서 바꾸는 경우, 옛 비밀번호로 들어와 있던 쪽이 여기서 끊겨야 한다
    assert_kicked_out(client, phone)
    me = client.get("/auth/me", headers=bearer(r.json()["accessToken"]))
    assert me.status_code == 200


def test_google_login_kicks_out_other_device(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-client-secret")
    verified_email_user(db_session)
    info = OAuthUserInfo(
        provider="google",
        provider_user_id="google-sub-multi",
        email="multi@example.com",
        email_verified=True,
        name="회원",
        picture=None,
    )
    monkeypatch.setattr(OAuthProvider, "fetch_user_info", lambda self, code: info)

    laptop = login(client, "multi@example.com", "oldpass123")
    state = create_state_token("/")
    r = client.get(
        f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
    )
    fragment = urlparse(r.headers["location"]).fragment
    token = parse_qs(fragment)["token"][0]

    assert_kicked_out(client, laptop)
    assert client.get("/auth/me", headers=bearer(token)).status_code == 200


def test_login_stores_new_number_each_time(client, db_session, regular_user):
    login(client)
    first = db_session.scalar(select(User.session_id).where(User.id == regular_user.id))
    login(client)
    second = db_session.scalar(
        select(User.session_id).where(User.id == regular_user.id)
    )
    assert first and second and first != second
