from app.models import Comment


def test_list_returns_approved_only(client, make_post, db_session):
    post = make_post(slug="a")
    db_session.add(Comment(post_id=post.id, author_name="x", content="ok", approved=True))
    db_session.add(
        Comment(post_id=post.id, author_name="y", content="hidden", approved=False)
    )
    db_session.commit()
    body = client.get("/posts/a/comments").json()
    assert len(body) == 1
    assert body[0]["content"] == "ok"


def test_create_comment(client, make_post):
    make_post(slug="a")
    r = client.post(
        "/posts/a/comments", json={"authorName": "홍길동", "content": "좋은 글이네요"}
    )
    assert r.status_code == 201
    data = r.json()
    assert data["authorName"] == "홍길동"
    assert "createdAt" in data


def test_comment_on_missing_post_404(client):
    r = client.post(
        "/posts/none/comments", json={"authorName": "a", "content": "b"}
    )
    assert r.status_code == 404
