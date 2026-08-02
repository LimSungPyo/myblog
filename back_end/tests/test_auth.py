from app.core.config import settings
from app.core.security import create_access_token
from app.models import User


def token_from(link: str) -> str:
    return link.split("token=", 1)[1]


def test_login_admin_returns_is_admin_true(client, admin_user):
    r = client.post("/auth/login", json={"username": "admin", "password": "admin1234"})
    assert r.status_code == 200
    assert r.json()["isAdmin"] is True


def test_login_regular_returns_is_admin_false(client, regular_user):
    r = client.post(
        "/auth/login", json={"username": "testuser", "password": "test1234"}
    )
    assert r.status_code == 200
    assert r.json()["isAdmin"] is False


def test_login_wrong_password(client, admin_user):
    r = client.post("/auth/login", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


# ─────────────── 회원가입 + 이메일 인증 ───────────────
SIGNUP = {
    "email": "new@example.com",
    "password": "pass12345",
    "displayName": "새회원",
}


def test_signup_sends_verification_mail(client, mail_outbox):
    r = client.post("/auth/signup", json={**SIGNUP, "email": "New@Example.com"})
    assert r.status_code == 201
    assert "메일" in r.json()["message"]
    kind, to, link = mail_outbox[0]
    assert kind == "verify"
    assert to == "new@example.com"  # 이메일은 소문자로 정규화되어 저장
    assert "/verify-email?token=" in link


def test_login_blocked_until_verified_then_verify_logs_in(client, mail_outbox):
    client.post("/auth/signup", json=SIGNUP)

    # 인증 전에는 비밀번호가 맞아도 로그인 불가
    r = client.post(
        "/auth/login",
        json={"username": SIGNUP["email"], "password": SIGNUP["password"]},
    )
    assert r.status_code == 403

    # 메일 링크의 토큰으로 인증 → 즉시 로그인 토큰 발급
    r = client.post("/auth/verify-email", json={"token": token_from(mail_outbox[0][2])})
    assert r.status_code == 200
    access = r.json()["accessToken"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"

    # 이후에는 이메일 로그인 가능 (대소문자 무관)
    r = client.post(
        "/auth/login", json={"username": "New@Example.com", "password": "pass12345"}
    )
    assert r.status_code == 200


def test_verify_email_is_idempotent(client, mail_outbox):
    client.post("/auth/signup", json=SIGNUP)
    token = token_from(mail_outbox[0][2])
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200
    # 링크를 한 번 더 열어도 에러 대신 그대로 로그인
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200


def test_verify_email_garbage_token_400(client):
    r = client.post("/auth/verify-email", json={"token": "garbage"})
    assert r.status_code == 400


def test_verify_email_rejects_access_token(client, regular_user):
    # 용도가 다른 토큰(API 인증용)은 typ이 달라 인증 링크로 쓸 수 없다
    token = create_access_token(str(regular_user.id))
    r = client.post("/auth/verify-email", json={"token": token})
    assert r.status_code == 400


def test_signup_duplicate_email_conflict(client, mail_outbox):
    assert client.post("/auth/signup", json=SIGNUP).status_code == 201
    # 대소문자만 달라도 같은 이메일로 취급
    r = client.post("/auth/signup", json={**SIGNUP, "email": "NEW@example.com"})
    assert r.status_code == 409


def test_signup_social_only_email_conflict(client, db_session, mail_outbox):
    db_session.add(
        User(email="social@example.com", hashed_password=None, display_name="소셜회원")
    )
    db_session.commit()
    r = client.post("/auth/signup", json={**SIGNUP, "email": "social@example.com"})
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert "소셜" in detail
    # 막다른 골목이 되지 않게 비밀번호를 얻는 경로(재설정)를 함께 안내한다
    assert "비밀번호" in detail


def test_signup_password_too_long(client):
    r = client.post(
        "/auth/signup",
        json={"email": "a@b.com", "password": "a" * 73, "displayName": "회원"},
    )
    assert r.status_code == 422


def test_signup_mail_unconfigured_503(client, monkeypatch):
    # 개발자 로컬 .env에 실제 SMTP 키가 있어도 미설정 상태를 보장
    monkeypatch.setattr(settings, "SMTP_USER", "")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    r = client.post("/auth/signup", json=SIGNUP)
    assert r.status_code == 503


def test_resend_verification(client, mail_outbox):
    client.post("/auth/signup", json=SIGNUP)
    assert len(mail_outbox) == 1
    r = client.post("/auth/resend-verification", json={"email": SIGNUP["email"]})
    assert r.status_code == 200
    assert len(mail_outbox) == 2


def test_resend_verification_unknown_email_no_leak(client, mail_outbox):
    # 미가입 이메일이어도 같은 응답 → 계정 존재 여부가 새어 나가지 않음
    r = client.post("/auth/resend-verification", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert mail_outbox == []


def test_resend_verification_already_verified_sends_nothing(client, mail_outbox):
    client.post("/auth/signup", json=SIGNUP)
    client.post("/auth/verify-email", json={"token": token_from(mail_outbox[0][2])})
    r = client.post("/auth/resend-verification", json={"email": SIGNUP["email"]})
    assert r.status_code == 200
    assert len(mail_outbox) == 1  # 추가 발송 없음


def test_login_social_only_account_rejected(client, db_session):
    db_session.add(
        User(email="social2@example.com", hashed_password=None, display_name="소셜회원")
    )
    db_session.commit()
    r = client.post(
        "/auth/login", json={"username": "social2@example.com", "password": "whatever1"}
    )
    assert r.status_code == 401


# ─────────────── me ───────────────
def test_me_returns_current_user(client, user_headers):
    r = client.get("/auth/me", headers=user_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "testuser"
    assert body["isAdmin"] is False
    assert "id" in body  # UUID


def test_me_without_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_garbage_token(client):
    r = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401
