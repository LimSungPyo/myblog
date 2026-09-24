from datetime import date, timedelta

from sqlalchemy import func, select

from app.models import PostView


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


# ─────────────── 방문 기록을 DB에 두는 이유 ───────────────
def test_view_is_not_recounted_after_process_restart(client, make_post, monkeypatch):
    """예전엔 "이미 센 방문자"를 프로세스 메모리에 기억해서, 배포·슬립으로 서버가 새로
    뜰 때마다 같은 독자가 다시 세어졌다. 기록이 DB에 있으면 메모리를 비워도 안 센다."""
    from app.core.ratelimit import store as rate_limit_store
    from app.crud import post_views

    make_post(slug="a")
    first = view(client).json()["viewCount"]

    # 재시작 흉내: 프로세스 메모리에 있던 상태를 전부 비운다
    rate_limit_store.reset()
    monkeypatch.setattr(post_views, "_last_purged_on", None)

    assert view(client).json()["viewCount"] == first


def test_same_visitor_counts_again_on_a_new_day(client, make_post, monkeypatch):
    make_post(slug="a")
    first = view(client).json()["viewCount"]
    monkeypatch.setattr("app.api.posts.today_utc", lambda: date(2099, 1, 2))
    assert view(client).json()["viewCount"] == first + 1


def test_view_records_are_deleted_with_the_post(client, make_post, db_session):
    post = make_post(slug="a")
    view(client)
    assert db_session.scalar(select(func.count()).select_from(PostView)) == 1
    db_session.delete(post)
    db_session.commit()
    assert db_session.scalar(select(func.count()).select_from(PostView)) == 0


# ─────────────── 오래된 방문 기록 청소 ───────────────
def test_purge_keeps_only_today_and_yesterday(make_post, db_session):
    """솔트가 날마다 바뀌어서 이틀 전 기록은 중복 판단에 쓸 수가 없다. 쌓아둘 이유가 없다."""
    from app.crud.post_views import purge_older_than_retention

    post = make_post(slug="a")
    today = date(2026, 9, 24)
    for days_ago in (0, 1, 2, 5):
        db_session.add(
            PostView(
                post_id=post.id,
                visitor=f"v{days_ago}",
                day=today - timedelta(days=days_ago),
            )
        )
    db_session.commit()

    assert purge_older_than_retention(db_session, today) == 2
    remaining = sorted(db_session.scalars(select(PostView.visitor)).all())
    assert remaining == ["v0", "v1"]


def test_purge_runs_at_most_once_a_day(db_session, monkeypatch):
    """스케줄러가 없어서 조회 요청이 올 때 청소한다. 요청마다 DELETE를 날리면 낭비다."""
    from app.crud import post_views

    calls = []
    monkeypatch.setattr(post_views, "_last_purged_on", None)
    monkeypatch.setattr(
        post_views, "purge_older_than_retention", lambda db, today: calls.append(today)
    )
    today = date(2026, 9, 24)
    for _ in range(3):
        post_views.purge_once_a_day(db_session, today)
    post_views.purge_once_a_day(db_session, today + timedelta(days=1))
    assert calls == [today, today + timedelta(days=1)]
