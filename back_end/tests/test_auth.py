from sqlalchemy import select

from app.models import User


def test_signup_creates_regular_user(client, db_session):
    r = client.post(
        "/auth/signup", json={"username": "newbie", "password": "pass1234"}
    )
    assert r.status_code == 201
    data = r.json()
    assert data["isAdmin"] is False
    assert "accessToken" in data

    user = db_session.scalar(select(User).where(User.username == "newbie"))
    assert user is not None
    assert user.is_admin is False
    assert user.hashed_password != "pass1234"  # 해시 저장 확인


def test_signup_duplicate_username(client, regular_user):
    r = client.post(
        "/auth/signup", json={"username": "testuser", "password": "pass1234"}
    )
    assert r.status_code == 409


def test_signup_validation(client):
    assert (
        client.post(
            "/auth/signup", json={"username": "ab", "password": "pass1234"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/auth/signup", json={"username": "abcd", "password": "12"}
        ).status_code
        == 422
    )


def test_login_admin_returns_is_admin_true(client, admin_user):
    r = client.post(
        "/auth/login", json={"username": "admin", "password": "admin1234"}
    )
    assert r.status_code == 200
    assert r.json()["isAdmin"] is True


def test_login_regular_returns_is_admin_false(client, regular_user):
    r = client.post(
        "/auth/login", json={"username": "testuser", "password": "test1234"}
    )
    assert r.status_code == 200
    assert r.json()["isAdmin"] is False


def test_login_wrong_password(client, admin_user):
    r = client.post(
        "/auth/login", json={"username": "admin", "password": "wrong"}
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
