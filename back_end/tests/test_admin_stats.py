from app.models import Comment


def test_stats_counts(client, admin_headers, make_post, db_session):
    p1 = make_post(slug="a", status="published")
    make_post(slug="b", status="published")
    make_post(slug="c", status="draft")
    db_session.add(Comment(post_id=p1.id, author_name="x", content="hi", approved=True))
    db_session.add(
        Comment(post_id=p1.id, author_name="y", content="spam", approved=False)
    )
    db_session.commit()

    body = client.get("/admin/stats", headers=admin_headers).json()
    assert body["postCount"] == 3
    assert body["publishedCount"] == 2
    assert body["draftCount"] == 1
    assert body["commentCount"] == 2
    assert body["pendingCommentCount"] == 1


def test_stats_top_posts_by_views(client, admin_headers, make_post, db_session):
    a = make_post(slug="a", status="published")
    b = make_post(slug="b", status="published")
    a.view_count = 100
    b.view_count = 5
    db_session.commit()

    body = client.get("/admin/stats", headers=admin_headers).json()
    assert body["totalViews"] == 105
    assert body["topPosts"][0]["slug"] == "a"  # 조회수 높은 순


def test_stats_requires_admin(client, user_headers):
    assert client.get("/admin/stats", headers=user_headers).status_code == 403
    assert client.get("/admin/stats").status_code == 401
