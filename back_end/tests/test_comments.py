from app.models import Comment


def test_list_returns_approved_only(client, make_post, db_session):
    post = make_post(slug="a")
    db_session.add(
        Comment(post_id=post.id, author_name="x", content="ok", approved=True)
    )
    db_session.add(
        Comment(post_id=post.id, author_name="y", content="hidden", approved=False)
    )
    db_session.commit()
    body = client.get("/posts/a/comments").json()
    assert len(body) == 1
    assert body[0]["content"] == "ok"


def test_create_comment(client, make_post, user_headers):
    make_post(slug="a")
    r = client.post(
        "/posts/a/comments", json={"content": "좋은 글이네요"}, headers=user_headers
    )
    assert r.status_code == 201
    data = r.json()
    # 작성자 이름은 클라이언트 입력이 아니라 로그인 사용자의 닉네임
    assert data["authorName"] == "testuser"
    assert "createdAt" in data


def test_create_comment_requires_login(client, make_post):
    make_post(slug="a")
    r = client.post("/posts/a/comments", json={"content": "익명 시도"})
    assert r.status_code == 401


def test_create_comment_ignores_client_author_name(client, make_post, user_headers):
    """authorName을 보내와도 무시하고 로그인 사용자 닉네임을 쓴다 (사칭 방지)."""
    make_post(slug="a")
    r = client.post(
        "/posts/a/comments",
        json={"authorName": "사칭시도", "content": "내용"},
        headers=user_headers,
    )
    assert r.status_code == 201
    assert r.json()["authorName"] == "testuser"


def test_comment_on_missing_post_404(client, user_headers):
    r = client.post("/posts/none/comments", json={"content": "b"}, headers=user_headers)
    assert r.status_code == 404
