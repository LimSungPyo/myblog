"""마이페이지 — 내 활동 보기, 닉네임 바꾸기, 내 글 지우기."""

import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models import Comment, GameScore, GuestbookEntry, User


@pytest.fixture
def other_user(db_session) -> User:
    user = User(
        email="other@example.com",
        email_verified=True,
        hashed_password=hash_password("other1234"),
        display_name="다른사람",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def other_headers(other_user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(other_user.id))}"}


def add_comment(db, post, user, content="댓글", approved=True) -> Comment:
    c = Comment(
        post_id=post.id,
        user_id=user.id if user else None,
        author_name=user.display_name if user else "익명",
        content=content,
        approved=approved,
    )
    db.add(c)
    db.commit()
    return c


def add_guestbook(db, user, content="방명록") -> GuestbookEntry:
    g = GuestbookEntry(
        user_id=user.id if user else None,
        author_name=user.display_name if user else "익명",
        content=content,
    )
    db.add(g)
    db.commit()
    return g


def add_score(db, user, score=100) -> GameScore:
    s = GameScore(
        game_key="2048", user_id=user.id, player_name=user.display_name, score=score
    )
    db.add(s)
    db.commit()
    return s


# ─────────────── 내 활동 ───────────────
def test_activity_requires_login(client):
    assert client.get("/me/activity").status_code == 401


def test_activity_shows_only_my_things(
    client, db_session, make_post, regular_user, other_user, user_headers
):
    post = make_post(slug="hello", title="안녕 글")
    add_comment(db_session, post, regular_user, "내 댓글")
    add_comment(db_session, post, other_user, "남의 댓글")
    add_guestbook(db_session, regular_user, "내 방명록")
    add_guestbook(db_session, other_user, "남의 방명록")
    add_score(db_session, regular_user, 512)
    add_score(db_session, other_user, 4096)

    body = client.get("/me/activity", headers=user_headers).json()

    assert [c["content"] for c in body["comments"]] == ["내 댓글"]
    assert body["comments"][0]["postSlug"] == "hello"
    assert body["comments"][0]["postTitle"] == "안녕 글"
    assert [g["content"] for g in body["guestbook"]] == ["내 방명록"]
    assert [s["score"] for s in body["scores"]] == [512]


def test_activity_shows_pending_comments_as_not_approved(
    client, db_session, make_post, regular_user, user_headers
):
    """승인 전 댓글은 공개 목록엔 없다. 본인에게는 보여줘야 사라진 줄 오해하지 않는다."""
    add_comment(db_session, make_post(slug="a"), regular_user, approved=False)
    comments = client.get("/me/activity", headers=user_headers).json()["comments"]
    assert comments[0]["approved"] is False


# ─────────────── 닉네임 변경 ───────────────
def test_rename_updates_account_and_all_my_past_posts(
    client, db_session, make_post, regular_user, other_user, user_headers
):
    post = make_post(slug="a")
    mine = add_comment(db_session, post, regular_user)
    theirs = add_comment(db_session, post, other_user)
    my_gb = add_guestbook(db_session, regular_user)
    my_score = add_score(db_session, regular_user)

    r = client.patch("/me", json={"displayName": "새이름"}, headers=user_headers)
    assert r.status_code == 200
    assert r.json()["displayName"] == "새이름"

    for obj in (mine, theirs, my_gb, my_score):
        db_session.refresh(obj)
    assert mine.author_name == "새이름"
    assert my_gb.author_name == "새이름"
    assert my_score.player_name == "새이름"
    # 남의 글은 그대로여야 한다
    assert theirs.author_name == "다른사람"


def test_rename_strips_spaces(client, user_headers):
    r = client.patch("/me", json={"displayName": "  새이름  "}, headers=user_headers)
    assert r.json()["displayName"] == "새이름"


@pytest.mark.parametrize("name", ["", "   ", "가" * 81])
def test_rename_rejects_blank_or_too_long(client, user_headers, name):
    """공백만 있는 이름은 글에 빈 칸으로 찍혀 누가 썼는지 알 수 없게 된다."""
    r = client.patch("/me", json={"displayName": name}, headers=user_headers)
    assert r.status_code == 422


def test_rename_requires_login(client):
    assert client.patch("/me", json={"displayName": "x"}).status_code == 401


# ─────────────── 내 글 지우기 ───────────────
def test_delete_my_comment(client, db_session, make_post, regular_user, user_headers):
    c = add_comment(db_session, make_post(slug="a"), regular_user)
    assert (
        client.delete(f"/me/comments/{c.id}", headers=user_headers).status_code == 204
    )
    assert db_session.get(Comment, c.id) is None


def test_cannot_delete_someone_elses_comment(
    client, db_session, make_post, other_user, user_headers
):
    """403이면 "그 댓글은 있다"를 알려주는 셈이라 번호를 바꿔가며 떠볼 수 있다. 404를 준다."""
    c = add_comment(db_session, make_post(slug="a"), other_user)
    r = client.delete(f"/me/comments/{c.id}", headers=user_headers)
    assert r.status_code == 404
    assert db_session.get(Comment, c.id) is not None


def test_cannot_delete_anonymous_legacy_comment(
    client, db_session, make_post, user_headers
):
    """계정 연동 전 익명 댓글(user_id 없음)은 누구의 것도 아니다."""
    c = add_comment(db_session, make_post(slug="a"), None)
    assert (
        client.delete(f"/me/comments/{c.id}", headers=user_headers).status_code == 404
    )


def test_delete_my_guestbook_entry(client, db_session, regular_user, user_headers):
    g = add_guestbook(db_session, regular_user)
    assert (
        client.delete(f"/me/guestbook/{g.id}", headers=user_headers).status_code == 204
    )
    assert db_session.get(GuestbookEntry, g.id) is None


def test_cannot_delete_someone_elses_guestbook_entry(
    client, db_session, other_user, user_headers
):
    g = add_guestbook(db_session, other_user)
    assert (
        client.delete(f"/me/guestbook/{g.id}", headers=user_headers).status_code == 404
    )
    assert db_session.scalar(select(GuestbookEntry).where(GuestbookEntry.id == g.id))
