"""관리자 사칭 닉네임 막기.

관리자가 쓴 글은 "관리자"로 보인다. 일반 회원이 닉네임을 "관리자"로 지을 수 있으면
방문자가 진짜 관리자와 구분할 수 없다.
"""

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.names import RESERVED_NAME_MESSAGE, is_reserved_name
from app.core.security import create_state_token
from app.models import User
from tests.test_oauth import callback_fragment, mock_user_info

BLOCKED = [
    "관리자",
    " 관 리 자 ",
    "관.리.자",
    "블로그관리자",
    "운영자",
    "운영진",
    "ADMIN",
    "Admin!!",
    "admin1",
    "administrator",
]
ALLOWED = ["홍길동", "관리", "badminton", "Admin Kim", "운영"]


@pytest.mark.parametrize("name", BLOCKED)
def test_reserved_names(name):
    """띄어쓰기·대소문자·숫자·기호만 바꿔 쓰는 우회도 잡는다."""
    assert is_reserved_name(name)


@pytest.mark.parametrize("name", ALLOWED)
def test_ordinary_names(name):
    """영어는 정확히 같을 때만 막는다. 포함으로 막으면 badminton 같은 이름까지 걸린다."""
    assert not is_reserved_name(name)


@pytest.fixture
def google_on(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-client-secret")


SIGNUP = {"email": "new@example.com", "password": "pass12345"}


def test_signup_rejects_reserved_name_without_sending_mail(client, mail_outbox):
    r = client.post("/auth/signup", json={**SIGNUP, "displayName": "관리자"})
    assert r.status_code == 400
    assert r.json()["detail"] == RESERVED_NAME_MESSAGE
    # 이름 때문에 거절된 요청은 메일을 보내지도, 메일 발송 한도를 깎지도 않는다
    assert mail_outbox == []


def test_signup_allows_ordinary_name(client, mail_outbox):
    r = client.post("/auth/signup", json={**SIGNUP, "displayName": "badminton"})
    assert r.status_code == 201


def test_member_cannot_rename_to_reserved_name(client, user_headers):
    r = client.patch("/me", json={"displayName": "운영자"}, headers=user_headers)
    assert r.status_code == 400
    assert r.json()["detail"] == RESERVED_NAME_MESSAGE


def test_admin_can_use_any_name(client, admin_headers):
    """관리자 본인은 예외다. 어차피 댓글·방명록에는 "관리자"로 찍힌다."""
    r = client.patch("/me", json={"displayName": "관리자"}, headers=admin_headers)
    assert r.status_code == 200


def test_social_signup_replaces_reserved_name(
    client, db_session, google_on, monkeypatch
):
    """소셜 가입은 이름을 직접 고른 게 아니라서, 막지 않고 기본 이름으로 바꾼다."""
    mock_user_info(monkeypatch, name="관리자")
    state = create_state_token("/")
    r = client.get(
        f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
    )
    assert r.status_code == 302
    assert "token" in callback_fragment(r)
    user = db_session.scalar(select(User).where(User.email == "user@gmail.com"))
    assert user.display_name == "google 사용자"
