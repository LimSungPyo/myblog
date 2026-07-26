def test_create_returns_entry(client):
    r = client.post(
        "/guestbook", json={"authorName": "홍길동", "content": "안녕하세요"}
    )
    assert r.status_code == 201
    d = r.json()
    assert d["authorName"] == "홍길동"
    assert d["content"] == "안녕하세요"
    assert "id" in d and "createdAt" in d


def test_create_validation(client):
    assert (
        client.post("/guestbook", json={"authorName": "", "content": "x"}).status_code
        == 422
    )
    assert (
        client.post("/guestbook", json={"authorName": "a", "content": ""}).status_code
        == 422
    )


def test_list_paginated_newest_first(client):
    for i in range(7):
        client.post("/guestbook", json={"authorName": f"u{i}", "content": f"msg{i}"})
    body = client.get("/guestbook?pageSize=5").json()
    assert body["total"] == 7
    assert body["totalPages"] == 2
    assert len(body["items"]) == 5
    # 최신순: 마지막에 만든 u6가 맨 앞
    assert body["items"][0]["authorName"] == "u6"


def test_admin_can_delete(client, admin_headers):
    created = client.post("/guestbook", json={"authorName": "a", "content": "b"}).json()
    eid = created["id"]
    assert (
        client.delete(f"/admin/guestbook/{eid}", headers=admin_headers).status_code
        == 204
    )
    body = client.get("/guestbook").json()
    assert all(i["id"] != eid for i in body["items"])


def test_admin_list_all(client, admin_headers):
    for i in range(3):
        client.post("/guestbook", json={"authorName": f"g{i}", "content": f"m{i}"})
    r = client.get("/admin/guestbook", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_admin_list_requires_admin(client, user_headers):
    assert client.get("/admin/guestbook").status_code == 401
    assert client.get("/admin/guestbook", headers=user_headers).status_code == 403


def test_delete_requires_admin(client, user_headers):
    created = client.post("/guestbook", json={"authorName": "a", "content": "b"}).json()
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
