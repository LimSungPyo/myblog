def _payload(**over):
    base = {
        "title": "글 제목",
        "slug": "my-post",
        "excerpt": "요약",
        "content": "본문",
        "categoryId": None,
        "tagIds": [],
        "status": "published",
    }
    base.update(over)
    return base


def test_admin_can_create_post(client, admin_headers, category, tag):
    r = client.post(
        "/admin/posts",
        json=_payload(categoryId=category.id, tagIds=[tag.id]),
        headers=admin_headers,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["slug"] == "my-post"
    assert data["publishedAt"] is not None  # publish 시 세팅
    assert [t["slug"] for t in data["tags"]] == ["nextjs"]


def test_regular_user_forbidden(client, user_headers):
    assert client.get("/admin/posts", headers=user_headers).status_code == 403
    assert (
        client.post("/admin/posts", json=_payload(), headers=user_headers).status_code
        == 403
    )


def test_no_token_unauthorized(client):
    assert client.get("/admin/posts").status_code == 401


def test_duplicate_slug_conflict(client, admin_headers, make_post):
    make_post(slug="dup")
    r = client.post(
        "/admin/posts", json=_payload(slug="dup"), headers=admin_headers
    )
    assert r.status_code == 409


def test_list_includes_drafts(client, admin_headers, make_post):
    make_post(slug="pub", status="published")
    make_post(slug="draft-1", status="draft")
    r = client.get("/admin/posts", headers=admin_headers)
    slugs = [p["slug"] for p in r.json()]
    assert "pub" in slugs and "draft-1" in slugs


def test_update_draft_to_published_sets_published_at(client, admin_headers, make_post):
    post = make_post(slug="d", status="draft")
    assert post.published_at is None
    r = client.put(
        f"/admin/posts/{post.id}",
        json=_payload(slug="d", status="published"),
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["publishedAt"] is not None


def test_delete_post(client, admin_headers, make_post):
    post = make_post(slug="del")
    assert (
        client.delete(f"/admin/posts/{post.id}", headers=admin_headers).status_code
        == 204
    )
    assert client.get("/posts/del").status_code == 404
