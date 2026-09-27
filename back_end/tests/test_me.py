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


# ─────────────── 회원 탈퇴 ───────────────
WITHDRAW = {"confirmation": "탈퇴합니다"}


def withdraw(client, headers, body=WITHDRAW):
    return client.post("/me/withdraw", json=body, headers=headers)


def test_withdraw_keeps_comments_and_scores_anonymized(
    client, db_session, make_post, regular_user, user_headers
):
    """댓글·게임 기록은 남겨서 대화 흐름과 순위표는 지키고, 누가 썼는지는 알 수 없게 한다."""
    post = make_post(slug="a")
    c = add_comment(db_session, post, regular_user, "남길 댓글")
    s = add_score(db_session, regular_user, 2048)
    user_id = regular_user.id

    assert withdraw(client, user_headers).status_code == 204

    db_session.expire_all()
    assert db_session.get(User, user_id) is None
    for obj, name_attr in ((c, "author_name"), (s, "player_name")):
        db_session.refresh(obj)
        assert getattr(obj, name_attr) == "탈퇴한 사용자"
        assert obj.user_id is None
    assert c.content == "남길 댓글"
    assert s.score == 2048


def test_withdraw_deletes_my_guestbook_entries(
    client, db_session, regular_user, user_headers
):
    """방명록은 대화가 이어지는 곳이 아니라 개인의 인사라서, 탈퇴하면 함께 지운다.
    (이미지가 붙으면 얼굴 같은 개인정보가 담길 수도 있다)"""
    mine = [
        add_guestbook(db_session, regular_user, f"내 인사 {i}").id for i in range(2)
    ]

    assert withdraw(client, user_headers).status_code == 204

    db_session.expire_all()
    for entry_id in mine:
        assert db_session.get(GuestbookEntry, entry_id) is None


def test_withdraw_leaves_other_and_legacy_guestbook_entries(
    client, db_session, regular_user, other_user, user_headers
):
    """지우는 건 탈퇴한 사람의 방명록뿐이다. 남의 글과 계정 연동 전 익명 글은 그대로다."""
    theirs = add_guestbook(db_session, other_user, "남의 인사")
    legacy = add_guestbook(db_session, None, "옛날 익명 인사")

    withdraw(client, user_headers)

    db_session.expire_all()
    assert db_session.get(GuestbookEntry, theirs.id) is not None
    assert db_session.get(GuestbookEntry, legacy.id) is not None


def test_withdraw_leaves_other_users_untouched(
    client, db_session, make_post, regular_user, other_user, user_headers
):
    theirs = add_comment(db_session, make_post(slug="a"), other_user)
    withdraw(client, user_headers)
    db_session.refresh(theirs)
    assert theirs.author_name == "다른사람"
    assert theirs.user_id == other_user.id


def test_withdraw_removes_social_login_links(
    client, db_session, regular_user, user_headers
):
    from app.models import SocialAccount

    db_session.add(
        SocialAccount(
            user_id=regular_user.id, provider="google", provider_user_id="g-1"
        )
    )
    db_session.commit()
    withdraw(client, user_headers)
    db_session.expire_all()
    assert db_session.scalars(select(SocialAccount)).all() == []


def test_token_stops_working_after_withdraw(client, user_headers):
    withdraw(client, user_headers)
    assert client.get("/auth/me", headers=user_headers).status_code == 401


def test_same_email_can_sign_up_again(client, other_user, other_headers, mail_outbox):
    """계정을 지웠는데 이메일이 막혀 있으면 다시 가입할 길이 없다."""
    assert withdraw(client, other_headers).status_code == 204
    r = client.post(
        "/auth/signup",
        json={
            "email": "other@example.com",
            "password": "newpass123",
            "displayName": "돌아온사람",
        },
    )
    assert r.status_code == 201


@pytest.mark.parametrize("phrase", ["", "탈퇴", "탈퇴 합니다", "withdraw"])
def test_withdraw_requires_exact_confirmation(
    client, db_session, regular_user, user_headers, phrase
):
    r = withdraw(client, user_headers, {"confirmation": phrase})
    assert r.status_code == 400
    db_session.expire_all()
    assert db_session.get(User, regular_user.id) is not None


def test_confirmation_ignores_surrounding_spaces(client, user_headers):
    assert (
        withdraw(client, user_headers, {"confirmation": " 탈퇴합니다 "}).status_code
        == 204
    )


def test_admin_cannot_withdraw(client, db_session, admin_user, admin_headers):
    """관리자가 실수로 사라지면 관리자 페이지에 들어갈 방법이 없다."""
    r = withdraw(client, admin_headers)
    assert r.status_code == 403
    db_session.expire_all()
    assert db_session.get(User, admin_user.id) is not None


def test_withdraw_requires_login(client):
    assert client.post("/me/withdraw", json=WITHDRAW).status_code == 401


# ─────────────── 관리자 글은 "관리자"로 ───────────────
def test_admin_comment_and_guestbook_show_as_admin(
    client, make_post, admin_user, admin_headers, user_headers
):
    """방문자에게는 관리자의 닉네임보다 "블로그 주인이 답했다"는 사실이 중요하다."""
    make_post(slug="a")
    r = client.post(
        "/posts/a/comments", json={"content": "답글"}, headers=admin_headers
    )
    assert r.json()["authorName"] == "관리자"
    r = client.post("/guestbook", data={"content": "환영해요"}, headers=admin_headers)
    assert r.json()["authorName"] == "관리자"
    # 일반 회원은 지금처럼 닉네임
    r = client.post("/guestbook", data={"content": "안녕"}, headers=user_headers)
    assert r.json()["authorName"] == "testuser"


def test_admin_rename_keeps_admin_name_on_posts(
    client, db_session, make_post, admin_user, admin_headers
):
    """관리자가 닉네임을 바꿔도 댓글·방명록은 "관리자"로 남고, 게임 기록만 새 닉네임을 따른다."""
    make_post(slug="a")
    client.post("/posts/a/comments", json={"content": "답글"}, headers=admin_headers)
    client.post("/guestbook", data={"content": "환영"}, headers=admin_headers)
    score = add_score(db_session, admin_user, 128)

    r = client.patch("/me", json={"displayName": "블로그주인"}, headers=admin_headers)
    assert r.status_code == 200

    db_session.expire_all()
    names = {
        db_session.scalar(select(Comment.author_name)),
        db_session.scalar(select(GuestbookEntry.author_name)),
    }
    assert names == {"관리자"}
    db_session.refresh(score)
    assert score.player_name == "블로그주인"
