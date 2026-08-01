def test_create_returns_entry(client, user_headers):
    r = client.post("/guestbook", json={"content": "안녕하세요"}, headers=user_headers)
    assert r.status_code == 201
    d = r.json()
    # 작성자 이름은 클라이언트 입력이 아니라 로그인 사용자의 닉네임
    assert d["authorName"] == "testuser"
    assert d["content"] == "안녕하세요"
    assert "id" in d and "createdAt" in d


def test_create_requires_login(client):
    assert client.post("/guestbook", json={"content": "익명 시도"}).status_code == 401


def test_create_validation(client, user_headers):
    assert (
        client.post(
            "/guestbook", json={"content": ""}, headers=user_headers
        ).status_code
        == 422
    )


def test_list_paginated_newest_first(client, user_headers):
    for i in range(7):
        client.post("/guestbook", json={"content": f"msg{i}"}, headers=user_headers)
    body = client.get("/guestbook?pageSize=5").json()
    assert body["total"] == 7
    assert body["totalPages"] == 2
    assert len(body["items"]) == 5
    # 최신순: 마지막에 만든 msg6이 맨 앞
    assert body["items"][0]["content"] == "msg6"


def test_admin_can_delete(client, admin_headers, user_headers):
    created = client.post(
        "/guestbook", json={"content": "b"}, headers=user_headers
    ).json()
    eid = created["id"]
    assert (
        client.delete(f"/admin/guestbook/{eid}", headers=admin_headers).status_code
        == 204
    )
    body = client.get("/guestbook").json()
    assert all(i["id"] != eid for i in body["items"])


def test_admin_list_all(client, admin_headers, user_headers):
    for i in range(3):
        client.post("/guestbook", json={"content": f"m{i}"}, headers=user_headers)
    r = client.get("/admin/guestbook", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_admin_list_requires_admin(client, user_headers):
    assert client.get("/admin/guestbook").status_code == 401
    assert client.get("/admin/guestbook", headers=user_headers).status_code == 403


def test_delete_requires_admin(client, user_headers):
    created = client.post(
        "/guestbook", json={"content": "b"}, headers=user_headers
    ).json()
    eid = created["id"]
    # 토큰 없음 → 401
    assert client.delete(f"/admin/guestbook/{eid}").status_code == 401
    # 일반 사용자 → 403
    assert (
        client.delete(f"/admin/guestbook/{eid}", headers=user_headers).status_code
        == 403
    )


def test_delete_missing_404(client, admin_headers):
    assert (
        client.delete("/admin/guestbook/999999", headers=admin_headers).status_code
        == 404
    )
