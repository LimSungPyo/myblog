def test_list_only_published(client, make_post):
    make_post(slug="pub", status="published")
    make_post(slug="dft", status="draft")
    slugs = [p["slug"] for p in client.get("/posts").json()["items"]]
    assert "pub" in slugs
    assert "dft" not in slugs


def test_pagination(client, make_post):
    for i in range(7):
        make_post(slug=f"p{i}", status="published")
    body = client.get("/posts?pageSize=3&page=1").json()
    assert body["total"] == 7
    assert len(body["items"]) == 3
    assert body["totalPages"] == 3


def test_filter_by_category(client, make_post, category):
    make_post(slug="a", category=category)
    make_post(slug="b")
    slugs = [
        p["slug"]
        for p in client.get(f"/posts?category={category.slug}").json()["items"]
    ]
    assert slugs == ["a"]


def test_filter_by_tag(client, make_post, tag):
    make_post(slug="a", tags=[tag])
    make_post(slug="b")
    slugs = [p["slug"] for p in client.get(f"/posts?tag={tag.slug}").json()["items"]]
    assert slugs == ["a"]


def test_search_matches_title(client, make_post):
    make_post(slug="a", title="FastAPI 튜토리얼", content="x")
    make_post(slug="b", title="다른 글", content="y")
    slugs = [p["slug"] for p in client.get("/posts?q=FastAPI").json()["items"]]
    assert slugs == ["a"]


def test_detail_increments_view_count(client, make_post):
    make_post(slug="a", status="published")
    v1 = client.get("/posts/a").json()["viewCount"]
    v2 = client.get("/posts/a").json()["viewCount"]
    assert v2 == v1 + 1


def test_detail_draft_returns_404(client, make_post):
    make_post(slug="d", status="draft")
    assert client.get("/posts/d").status_code == 404


def test_detail_missing_returns_404(client):
    assert client.get("/posts/nope").status_code == 404


def test_slugs_endpoint_published_only(client, make_post):
    make_post(slug="a", status="published")
    make_post(slug="b", status="draft")
    slugs = client.get("/posts/slugs").json()
    assert "a" in slugs and "b" not in slugs
