"""프론트엔드와의 계약: 응답이 camelCase로 나가는지 회귀 방지."""


def test_post_response_is_camel_case(client, make_post, category, tag):
    make_post(slug="a", category=category, tags=[tag], status="published")
    body = client.get("/posts/a").json()
    for key in ("coverImage", "viewCount", "createdAt", "updatedAt", "publishedAt"):
        assert key in body, f"{key} 누락"
    # snake_case는 나오면 안 됨
    assert "view_count" not in body
    assert "cover_image" not in body


def test_login_response_is_camel_case(client, admin_user):
    body = client.post(
        "/auth/login", json={"username": "admin", "password": "admin1234"}
    ).json()
    assert "accessToken" in body
    assert "isAdmin" in body
    assert "access_token" not in body
