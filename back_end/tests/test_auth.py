from sqlalchemy import func, select

from app.core.config import settings
from app.core.ratelimit import (
    LOGIN_BY_IDENTITY,
    LOGIN_BY_IP,
    MAIL_BY_IP,
    MAIL_BY_RECIPIENT,
)
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
    # 회원은 닉네임이 아니라 이메일로 로그인한다. "아이디"라고 안내하면 닉네임을 넣게 된다.
    assert r.json()["detail"] == "이메일 또는 비밀번호가 올바르지 않습니다."


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
    token = create_access_token(str(regular_user.id), regular_user.session_id)
    r = client.post("/auth/verify-email", json={"token": token})
    assert r.status_code == 400


def test_signup_duplicate_email_conflict(client, mail_outbox):
    assert client.post("/auth/signup", json=SIGNUP).status_code == 201
    # 대소문자만 달라도 같은 이메일로 취급
    r = client.post("/auth/signup", json={**SIGNUP, "email": "NEW@example.com"})
    assert r.status_code == 409


def test_signup_race_on_same_email_returns_409_not_500(
    client, db_session, mail_outbox, monkeypatch
):
    """ "이미 있나 확인"과 "저장" 사이에 같은 이메일 가입이 먼저 끝나는 경우.

    가입 버튼을 빠르게 두 번 누르면 생긴다. DB의 UNIQUE 제약이 막아서 계정은 하나만
    생기지만, 그 거절을 처리하지 않으면 사용자는 500 에러를 본다.
    """
    assert client.post("/auth/signup", json=SIGNUP).status_code == 201
    # 두 번째 요청이 확인 단계를 이미 통과한 상황: 확인이 "없음"을 돌려준다
    monkeypatch.setattr("app.api.auth._find_user_by_email", lambda db, email: None)

    r = client.post("/auth/signup", json=SIGNUP)

    assert r.status_code == 409
    assert r.json()["detail"] == "이미 가입된 이메일입니다."
    count = db_session.scalar(
        select(func.count()).select_from(User).where(User.email == SIGNUP["email"])
    )
    assert count == 1


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
    # 개발자 로컬 .env에 실제 메일 키가 있어도 미설정 상태를 보장
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "MAIL_FROM_EMAIL", "")
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


# ─────────────── 로그인 요청 제한 ───────────────
def fail_login(client, username: str = "admin", password: str = "wrong"):
    return client.post("/auth/login", json={"username": username, "password": password})


def test_login_blocked_after_repeated_failures(client, admin_user):
    for _ in range(LOGIN_BY_IDENTITY.limit):
        assert fail_login(client).status_code == 401
    r = fail_login(client)
    assert r.status_code == 429
    assert r.headers["Retry-After"]


def test_blocked_login_rejects_even_correct_password(client, admin_user):
    """차단 중에는 비밀번호가 맞아도 안 통해야 한다. 안 그러면 대입을 못 막는다."""
    for _ in range(LOGIN_BY_IDENTITY.limit):
        fail_login(client)
    r = client.post("/auth/login", json={"username": "admin", "password": "admin1234"})
    assert r.status_code == 429


def test_successful_login_clears_failure_count(client, admin_user):
    for _ in range(LOGIN_BY_IDENTITY.limit - 1):
        fail_login(client)
    assert (
        client.post(
            "/auth/login", json={"username": "admin", "password": "admin1234"}
        ).status_code
        == 200
    )
    # 카운터가 지워졌으니 다시 한도만큼 실패할 여유가 있어야 한다
    for _ in range(LOGIN_BY_IDENTITY.limit - 1):
        assert fail_login(client).status_code == 401


def test_limit_is_per_identity(client, admin_user, regular_user):
    for _ in range(LOGIN_BY_IDENTITY.limit):
        fail_login(client, "admin")
    assert fail_login(client, "admin").status_code == 429
    # 다른 계정은 영향을 받지 않는다 (IP 한도에는 아직 여유가 있음)
    assert fail_login(client, "testuser").status_code == 401


def test_unknown_account_is_counted_the_same(client):
    """없는 계정이라고 안 세면, 429가 나오는지 여부가 계정 존재 여부를 알려준다."""
    for _ in range(LOGIN_BY_IDENTITY.limit):
        assert fail_login(client, "nobody@example.com").status_code == 401
    assert fail_login(client, "nobody@example.com").status_code == 429


def test_identity_key_is_case_insensitive(client):
    """대소문자만 바꿔 제한을 우회할 수 없어야 한다."""
    for _ in range(LOGIN_BY_IDENTITY.limit):
        fail_login(client, "Nobody@Example.com")
    assert fail_login(client, "nobody@example.com").status_code == 429


def test_ip_limit_blocks_across_accounts(client):
    """계정을 바꿔가며 두들기는 건 계정 축으로는 안 잡히고 IP 축으로 잡힌다."""
    for i in range(LOGIN_BY_IP.limit):
        assert fail_login(client, f"user{i}@example.com").status_code == 401
    assert fail_login(client, "another@example.com").status_code == 429


# ─────────────── 메일 발송 요청 제한 ───────────────
def forgot(client, email: str = "target@example.com"):
    return client.post("/auth/forgot-password", json={"email": email})


def test_mail_blocked_after_limit_for_same_recipient(client, mail_outbox):
    for _ in range(MAIL_BY_RECIPIENT.limit):
        assert forgot(client).status_code == 200
    r = forgot(client)
    assert r.status_code == 429
    assert r.headers["Retry-After"]


def test_mail_limit_stops_actual_sending(client, regular_user, db_session, mail_outbox):
    """한도를 넘긴 요청은 Brevo로 나가지 않아야 한다. 막는 목적이 발송 자체다."""
    regular_user.email = "target@example.com"
    regular_user.email_verified = True
    db_session.commit()
    for _ in range(MAIL_BY_RECIPIENT.limit):
        forgot(client)
    sent_before = len(mail_outbox)
    assert forgot(client).status_code == 429
    assert len(mail_outbox) == sent_before


def test_mail_limit_is_per_recipient(client, mail_outbox):
    for _ in range(MAIL_BY_RECIPIENT.limit):
        forgot(client, "a@example.com")
    assert forgot(client, "a@example.com").status_code == 429
    assert forgot(client, "b@example.com").status_code == 200


def test_mail_limit_counts_unregistered_address_too(client, mail_outbox):
    """가입된 주소만 카운트하면, 429가 나오는지로 가입 여부를 알 수 있게 된다."""
    for _ in range(MAIL_BY_RECIPIENT.limit):
        assert forgot(client, "nobody@example.com").status_code == 200
    assert forgot(client, "nobody@example.com").status_code == 429


def test_mail_recipient_key_is_case_insensitive(client, mail_outbox):
    for _ in range(MAIL_BY_RECIPIENT.limit):
        forgot(client, "Target@Example.com")
    assert forgot(client, "target@example.com").status_code == 429


def test_mail_quota_is_shared_across_endpoints(client, mail_outbox):
    """창구를 바꿔가며 같은 사람에게 세 배로 보낼 수 없어야 한다."""
    for _ in range(MAIL_BY_RECIPIENT.limit):
        forgot(client, "target@example.com")
    r = client.post("/auth/resend-verification", json={"email": "target@example.com"})
    assert r.status_code == 429
    r = client.post("/auth/signup", json={**SIGNUP, "email": "target@example.com"})
    assert r.status_code == 429


def test_mail_ip_limit_blocks_rotating_addresses(client, mail_outbox):
    """수신 주소를 계속 바꾸면 주소 축으로는 안 잡힌다. IP 축이 무료 발송 한도를 지킨다."""
    for i in range(MAIL_BY_IP.limit):
        assert forgot(client, f"user{i}@example.com").status_code == 200
    assert forgot(client, "another@example.com").status_code == 429
