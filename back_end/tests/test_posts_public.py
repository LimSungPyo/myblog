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


def test_search_hashtag_matches_tag_by_slug(client, make_post, tag):
    # tag 픽스처: name="Next.js", slug="nextjs"
    make_post(slug="tagged", tags=[tag])
    make_post(slug="untagged")
    body = client.get("/posts", params={"q": "#nextjs"}).json()
    assert [p["slug"] for p in body["items"]] == ["tagged"]


def test_search_hashtag_matches_tag_by_name(client, make_post, tag):
    make_post(slug="tagged", tags=[tag])
    make_post(slug="untagged")
    # 이름(대소문자·점 포함)으로도 매칭
    body = client.get("/posts", params={"q": "#Next.js"}).json()
    assert [p["slug"] for p in body["items"]] == ["tagged"]


def test_search_hashtag_ignores_title(client, make_post):
    # 제목에 nextjs가 있어도 태그가 없으면 #검색엔 안 걸림
    make_post(slug="a", title="nextjs 튜토리얼")
    body = client.get("/posts", params={"q": "#nextjs"}).json()
    assert body["items"] == []


def test_get_does_not_increment_view(client, make_post):
    make_post(slug="a", status="published")
    v1 = client.get("/posts/a").json()["viewCount"]
    v2 = client.get("/posts/a").json()["viewCount"]
    assert v2 == v1  # GET은 더 이상 조회수를 올리지 않음


def test_view_endpoint_increments(client, make_post):
    make_post(slug="a", status="published")
    v1 = client.get("/posts/a").json()["viewCount"]
    r = client.post("/posts/a/view")
    assert r.status_code == 200
    assert r.json()["viewCount"] == v1 + 1


def test_view_endpoint_draft_404(client, make_post):
    make_post(slug="d", status="draft")
    assert client.post("/posts/d/view").status_code == 404


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


# ─────────────── 조회수 중복 제거 ───────────────
def view(client, slug: str = "a", ua: str = "browser-1"):
    return client.post(f"/posts/{slug}/view", headers={"user-agent": ua})


def test_view_counted_once_per_visitor(client, make_post):
    """curl을 반복해도 숫자가 안 올라야 한다. 이게 이 기능의 목적이다."""
    make_post(slug="a")
    first = view(client).json()["viewCount"]
    for _ in range(10):
        assert view(client).json()["viewCount"] == first


def test_repeat_view_returns_200_not_429(client, make_post):
    """재방문은 잘못된 요청이 아니라 정상 동작이다. 클라이언트가 재시도할 일도 없다."""
    make_post(slug="a")
    view(client)
    r = view(client)
    assert r.status_code == 200


def test_different_visitors_are_counted_separately(client, make_post):
    make_post(slug="a")
    first = view(client, ua="browser-1").json()["viewCount"]
    assert view(client, ua="browser-2").json()["viewCount"] == first + 1


def test_dedup_is_per_post(client, make_post):
    """한 글을 읽었다고 다른 글의 조회수까지 막히면 안 된다."""
    make_post(slug="a")
    make_post(slug="b")
    view(client, "a")
    before = client.get("/posts/b").json()["viewCount"]
    assert view(client, "b").json()["viewCount"] == before + 1


def test_visitor_id_hides_the_raw_ip(client, make_post):
    """식별자에 IP 원문이 남으면 개인정보를 그대로 들고 있는 셈이 된다."""
    from app.core.ratelimit import visitor_id
    from tests.test_ratelimit import make_request

    ip = "203.0.113.9"
    identifier = visitor_id(make_request(ip))
    assert ip not in identifier
    # 같은 방문자는 같은 값으로, 다른 방문자는 다른 값으로 떨어져야 한다
    assert identifier == visitor_id(make_request(ip))
    assert identifier != visitor_id(make_request("203.0.113.10"))
