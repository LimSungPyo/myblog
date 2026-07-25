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
