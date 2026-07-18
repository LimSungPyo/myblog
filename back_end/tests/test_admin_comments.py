from app.models import Comment


def _add_comment(db_session, post, content="hi", approved=True):
    c = Comment(
        post_id=post.id, author_name="tester", content=content, approved=approved
    )
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


def test_admin_lists_all_comments(client, admin_headers, make_post, db_session):
    post = make_post(slug="a", title="글제목")
    _add_comment(db_session, post, content="ok", approved=True)
    _add_comment(db_session, post, content="hidden", approved=False)

    body = client.get("/admin/comments", headers=admin_headers).json()
    assert len(body) == 2  # 승인/미승인 모두 포함
    assert {c["content"] for c in body} == {"ok", "hidden"}
    assert body[0]["postTitle"] == "글제목"  # 글 정보 포함


def test_regular_user_forbidden(client, user_headers):
    assert client.get("/admin/comments", headers=user_headers).status_code == 403


def test_no_token_unauthorized(client):
    assert client.get("/admin/comments").status_code == 401


def test_moderate_toggles_public_visibility(
    client, admin_headers, make_post, db_session
):
    post = make_post(slug="a")
    c = _add_comment(db_session, post, content="spam", approved=True)

    # 공개 목록에 보임
    assert len(client.get("/posts/a/comments").json()) == 1

    # 미승인 처리
    r = client.patch(
        f"/admin/comments/{c.id}", json={"approved": False}, headers=admin_headers
    )
    assert r.status_code == 200
    assert r.json()["approved"] is False

    # 공개 목록에서 사라짐
    assert len(client.get("/posts/a/comments").json()) == 0


def test_delete_comment(client, admin_headers, make_post, db_session):
    post = make_post(slug="a")
    c = _add_comment(db_session, post)
    assert (
        client.delete(f"/admin/comments/{c.id}", headers=admin_headers).status_code
        == 204
    )
    assert len(client.get("/posts/a/comments").json()) == 0


def test_moderate_missing_404(client, admin_headers):
    assert (
        client.patch(
            "/admin/comments/99999", json={"approved": True}, headers=admin_headers
        ).status_code
        == 404
    )
