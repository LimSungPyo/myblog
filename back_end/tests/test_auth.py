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


# ─────────────── 회원가입 / 이메일 로그인 ───────────────
def test_signup_creates_user_and_logs_in(client):
    r = client.post(
        "/auth/signup",
        json={
            "email": "New@Example.com",
            "password": "pass12345",
            "displayName": "새회원",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["isAdmin"] is False
    # 발급된 토큰으로 바로 인증 가능 + 이메일은 소문자로 정규화되어 저장
    me = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {body['accessToken']}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"
    assert me.json()["displayName"] == "새회원"


def test_signup_duplicate_email_conflict(client):
    payload = {
        "email": "dup@example.com",
        "password": "pass12345",
        "displayName": "회원",
    }
    assert client.post("/auth/signup", json=payload).status_code == 201
    # 대소문자만 달라도 같은 이메일로 취급
    payload["email"] = "DUP@example.com"
    assert client.post("/auth/signup", json=payload).status_code == 409


def test_signup_social_only_email_conflict(client, db_session):
    from app.models import User

    db_session.add(
        User(email="social@example.com", hashed_password=None, display_name="소셜회원")
    )
    db_session.commit()
    r = client.post(
        "/auth/signup",
        json={
            "email": "social@example.com",
            "password": "pass12345",
            "displayName": "회원",
        },
    )
    assert r.status_code == 409
    assert "소셜" in r.json()["detail"]


def test_signup_password_too_long(client):
    r = client.post(
        "/auth/signup",
        json={"email": "a@b.com", "password": "a" * 73, "displayName": "회원"},
    )
    assert r.status_code == 422


def test_login_with_email(client):
    client.post(
        "/auth/signup",
        json={
            "email": "mail@example.com",
            "password": "pass12345",
            "displayName": "회원",
        },
    )
    r = client.post(
        "/auth/login", json={"username": "Mail@Example.com", "password": "pass12345"}
    )
    assert r.status_code == 200
    assert r.json()["isAdmin"] is False


def test_login_social_only_account_rejected(client, db_session):
    from app.models import User

    db_session.add(
        User(email="social2@example.com", hashed_password=None, display_name="소셜회원")
    )
    db_session.commit()
    r = client.post(
        "/auth/login", json={"username": "social2@example.com", "password": "whatever1"}
    )
    assert r.status_code == 401


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
