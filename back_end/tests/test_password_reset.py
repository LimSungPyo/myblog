"""비밀번호 찾기/재설정 흐름 테스트.

재설정 토큰은 DB에 저장하지 않는 대신 발급 시점의 비밀번호 지문을 품고 있어서,
비밀번호가 바뀌는 순간(= 한 번 사용되는 순간) 저절로 무효가 된다.
"""

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models import User

EMAIL = "resetme@example.com"


def token_from(link: str) -> str:
    return link.split("token=", 1)[1]


def last_reset_token(outbox) -> str:
    kind, _to, link = outbox[-1]
    assert kind == "reset"
    return token_from(link)


@pytest.fixture
def email_user(client, db_session, mail_outbox) -> User:
    """이메일 가입 + 인증까지 끝난 사용자."""
    client.post(
        "/auth/signup",
        json={"email": EMAIL, "password": "oldpass123", "displayName": "회원"},
    )
    user = db_session.scalar(select(User).where(User.email == EMAIL))
    user.email_verified = True
    db_session.commit()
    mail_outbox.clear()
    return user


def test_forgot_password_sends_reset_mail(client, email_user, mail_outbox):
    r = client.post("/auth/forgot-password", json={"email": EMAIL})
    assert r.status_code == 200
    kind, to, link = mail_outbox[0]
    assert kind == "reset"
    assert to == EMAIL
    assert "/reset-password?token=" in link


def test_forgot_password_unknown_email_no_leak(client, mail_outbox):
    # 미가입 이메일이어도 같은 응답 → 계정 존재 여부가 새어 나가지 않음
    r = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert mail_outbox == []


def test_forgot_password_mail_unconfigured_503(client, monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "MAIL_FROM_EMAIL", "")
    r = client.post("/auth/forgot-password", json={"email": EMAIL})
    assert r.status_code == 503


def test_reset_password_changes_password_and_logs_in(client, email_user, mail_outbox):
    client.post("/auth/forgot-password", json={"email": EMAIL})
    r = client.post(
        "/auth/reset-password",
        json={"token": last_reset_token(mail_outbox), "password": "newpass123"},
    )
    assert r.status_code == 200
    access = r.json()["accessToken"]
    assert (
        client.get(
            "/auth/me", headers={"Authorization": f"Bearer {access}"}
        ).status_code
        == 200
    )

    # 이전 비밀번호는 더 이상 안 되고, 새 비밀번호로 로그인된다
    old = client.post("/auth/login", json={"username": EMAIL, "password": "oldpass123"})
    assert old.status_code == 401
    new = client.post("/auth/login", json={"username": EMAIL, "password": "newpass123"})
    assert new.status_code == 200


def test_reset_token_is_single_use(client, email_user, mail_outbox):
    client.post("/auth/forgot-password", json={"email": EMAIL})
    token = last_reset_token(mail_outbox)
    assert (
        client.post(
            "/auth/reset-password", json={"token": token, "password": "newpass123"}
        ).status_code
        == 200
    )
    # 같은 링크 재사용 → 비밀번호가 이미 바뀌어 지문 불일치
    r = client.post(
        "/auth/reset-password", json={"token": token, "password": "another123"}
    )
    assert r.status_code == 400


def test_reset_password_also_verifies_email(client, mail_outbox):
    """미인증 가입자도 재설정 메일을 받았다는 것 자체가 이메일 소유 증명."""
    client.post(
        "/auth/signup",
        json={
            "email": "unverified@example.com",
            "password": "oldpass123",
            "displayName": "회원",
        },
    )
    client.post("/auth/forgot-password", json={"email": "unverified@example.com"})
    r = client.post(
        "/auth/reset-password",
        json={"token": last_reset_token(mail_outbox), "password": "newpass123"},
    )
    assert r.status_code == 200
    # 인증 절차 없이도 로그인 가능 (403이 아님)
    r = client.post(
        "/auth/login",
        json={"username": "unverified@example.com", "password": "newpass123"},
    )
    assert r.status_code == 200


def test_reset_lets_social_only_account_set_password(client, db_session, mail_outbox):
    """소셜 전용 계정도 이메일 소유 증명을 거쳐 비밀번호를 만들 수 있다."""
    db_session.add(
        User(
            email="social@example.com",
            hashed_password=None,
            email_verified=True,
            display_name="소셜회원",
        )
    )
    db_session.commit()
    client.post("/auth/forgot-password", json={"email": "social@example.com"})
    r = client.post(
        "/auth/reset-password",
        json={"token": last_reset_token(mail_outbox), "password": "newpass123"},
    )
    assert r.status_code == 200
    r = client.post(
        "/auth/login", json={"username": "social@example.com", "password": "newpass123"}
    )
    assert r.status_code == 200


def test_reset_with_garbage_token_400(client):
    r = client.post(
        "/auth/reset-password", json={"token": "garbage", "password": "newpass123"}
    )
    assert r.status_code == 400


def test_reset_rejects_access_token(client, email_user):
    token = create_access_token(str(email_user.id))
    r = client.post(
        "/auth/reset-password", json={"token": token, "password": "newpass123"}
    )
    assert r.status_code == 400
