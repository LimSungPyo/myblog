import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models import Comment, GameScore, GuestbookEntry, User

# 마이페이지 목록 상한. 한 사람이 수백 개를 쓰는 블로그가 아니라 페이지를 나누지 않았다.
# 상한은 혹시 모를 폭주로 응답이 끝없이 커지는 걸 막는 안전장치다.
ACTIVITY_LIMIT = 100


def list_my_comments(db: Session, user_id: uuid.UUID) -> list[Comment]:
    return list(
        db.scalars(
            select(Comment)
            .where(Comment.user_id == user_id)
            .options(selectinload(Comment.post))
            .order_by(Comment.created_at.desc(), Comment.id.desc())
            .limit(ACTIVITY_LIMIT)
        ).all()
    )


def list_my_guestbook(db: Session, user_id: uuid.UUID) -> list[GuestbookEntry]:
    return list(
        db.scalars(
            select(GuestbookEntry)
            .where(GuestbookEntry.user_id == user_id)
            .order_by(GuestbookEntry.created_at.desc(), GuestbookEntry.id.desc())
            .limit(ACTIVITY_LIMIT)
        ).all()
    )


def list_my_scores(db: Session, user_id: uuid.UUID) -> list[GameScore]:
    return list(
        db.scalars(
            select(GameScore)
            .where(GameScore.user_id == user_id)
            .order_by(GameScore.created_at.desc(), GameScore.id.desc())
            .limit(ACTIVITY_LIMIT)
        ).all()
    )


def rename(db: Session, user: User, display_name: str) -> User:
    """닉네임을 바꾸고, 예전에 쓴 글에 찍힌 이름도 같이 바꾼다.

    댓글·방명록·점수는 "쓸 당시 닉네임"을 복사해 저장하는 구조(스냅샷)라 계정 이름만
    바꾸면 옛 글에는 옛 이름이 남는다. 한 사람이 두 이름으로 보이는 혼란을 막기로 해서
    전부 새 이름으로 맞춘다. 네 군데가 한 커밋에 묶여 있어서, 중간에 실패하면 전부
    되돌아가고 이름이 반쯤만 바뀐 상태로 남지 않는다.
    """
    user.display_name = display_name
    db.execute(
        update(Comment)
        .where(Comment.user_id == user.id)
        .values(author_name=display_name)
    )
    db.execute(
        update(GuestbookEntry)
        .where(GuestbookEntry.user_id == user.id)
        .values(author_name=display_name)
    )
    db.execute(
        update(GameScore)
        .where(GameScore.user_id == user.id)
        .values(player_name=display_name)
    )
    db.commit()
    db.refresh(user)
    return user


def get_my_comment(db: Session, user_id: uuid.UUID, comment_id: int) -> Comment | None:
    return db.scalar(
        select(Comment).where(Comment.id == comment_id, Comment.user_id == user_id)
    )


def get_my_guestbook(
    db: Session, user_id: uuid.UUID, entry_id: int
) -> GuestbookEntry | None:
    return db.scalar(
        select(GuestbookEntry).where(
            GuestbookEntry.id == entry_id, GuestbookEntry.user_id == user_id
        )
    )


# 탈퇴한 사람이 남긴 글에 찍힐 이름. 글은 남겨서 다른 사람과 주고받은 흐름은 지키고,
# 누가 썼는지는 알 수 없게 한다.
WITHDRAWN_NAME = "탈퇴한 사용자"


def withdraw(db: Session, user: User) -> None:
    """계정을 지운다. 남긴 글은 남기되 이름과 계정 연결을 끊는다.

    외래 키가 `ON DELETE SET NULL`이라 계정만 지워도 연결은 끊기지만, 글에 복사해둔
    닉네임은 그대로 남는다. 계정은 없는데 이름은 계속 보이면 "지워달라"는 요청에
    온전히 응한 게 아니라서 복사본을 먼저 덮어쓴다. 연결 끊기도 DB에 맡기지 않고 여기서
    명시적으로 한다. 이 함수만 읽어도 탈퇴가 무엇을 하는지 다 보이게 하려는 것이다.

    소셜 로그인 연결(social_accounts)은 `ON DELETE CASCADE`라 계정과 함께 지워진다.
    전부 한 커밋이라, 중간에 실패하면 계정도 글도 원래대로 남는다.
    """
    anonymized = {"user_id": None}
    db.execute(
        update(Comment)
        .where(Comment.user_id == user.id)
        .values(author_name=WITHDRAWN_NAME, **anonymized)
    )
    db.execute(
        update(GuestbookEntry)
        .where(GuestbookEntry.user_id == user.id)
        .values(author_name=WITHDRAWN_NAME, **anonymized)
    )
    db.execute(
        update(GameScore)
        .where(GameScore.user_id == user.id)
        .values(player_name=WITHDRAWN_NAME, **anonymized)
    )
    db.delete(user)
    db.commit()
