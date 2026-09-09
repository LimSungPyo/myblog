from app.core.ratelimit import WRITE_BY_USER
from app.models import GuestbookEntry


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


def test_list_paginated_newest_first(client, db_session, regular_user):
    # API 대신 DB로 직접 심는다. 이 테스트의 관심사는 목록 조회이고,
    # 7건을 API로 만들면 도배 제한(5건/10분)에 걸려 준비 단계가 먼저 깨진다.
    for i in range(7):
        db_session.add(
            GuestbookEntry(
                user_id=regular_user.id, author_name="testuser", content=f"msg{i}"
            )
        )
    db_session.commit()
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


# ─────────────── 도배 제한 ───────────────
def write_entry(client, headers, content: str = "도배"):
    return client.post("/guestbook", json={"content": content}, headers=headers)


def test_guestbook_blocked_after_limit(client, user_headers):
    for _ in range(WRITE_BY_USER.limit):
        assert write_entry(client, user_headers).status_code == 201
    r = write_entry(client, user_headers)
    assert r.status_code == 429
    assert r.headers["Retry-After"]


def test_guestbook_limit_is_per_account(client, user_headers, admin_headers):
    for _ in range(WRITE_BY_USER.limit):
        write_entry(client, user_headers)
    assert write_entry(client, user_headers).status_code == 429
    # 다른 계정은 영향을 받지 않는다
    assert write_entry(client, admin_headers).status_code == 201


def test_validation_failure_does_not_consume_quota(client, user_headers):
    """빈 내용으로 422를 맞은 건 도배가 아니다. 그걸로 몫을 깎으면 안 된다."""
    for _ in range(10):
        assert write_entry(client, user_headers, "").status_code == 422
    assert write_entry(client, user_headers).status_code == 201
