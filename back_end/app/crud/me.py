import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload

from app.core.storage import delete_image_quietly
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


# 탈퇴한 사람이 남긴 댓글·게임 기록에 찍힐 이름. 글은 남겨서 다른 사람과 주고받은
# 흐름은 지키고, 누가 썼는지는 알 수 없게 한다. (방명록은 남기지 않고 지운다)
WITHDRAWN_NAME = "탈퇴한 사용자"


def withdraw(db: Session, user: User) -> None:
    """계정을 지운다. 댓글·게임 기록은 남기되 이름과 계정 연결을 끊고, 방명록은 지운다.

    댓글은 다른 사람과 주고받은 대화라, 한쪽 말만 사라지면 남은 답글이 무슨 뜻인지
    알 수 없게 된다. 게임 기록도 지우면 순위표가 과거로 거슬러 바뀐다. 그래서 둘은 남기고
    "탈퇴한 사용자"로 익명화한다.

    방명록은 대화가 아니라 한 사람의 인사라서, 남겨도 지켜줄 흐름이 없다. 사진을 붙일 수
    있게 되면 얼굴 같은 개인정보가 담길 수도 있다. 그래서 탈퇴하면 함께 지운다.

    외래 키가 `ON DELETE SET NULL`이라 계정만 지워도 연결은 끊기지만, 글에 복사해둔
    닉네임은 그대로 남는다. 그래서 복사본을 먼저 덮어쓴다. 연결 끊기와 방명록 삭제도
    DB 규칙에 맡기지 않고 여기서 명시적으로 한다. 이 함수만 읽어도 탈퇴가 무엇을 하는지
    다 보이게 하려는 것이다.

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
        update(GameScore)
        .where(GameScore.user_id == user.id)
        .values(player_name=WITHDRAWN_NAME, **anonymized)
    )
    # 지우기 전에 사진 경로부터 챙긴다. 글이 지워지면 어떤 파일을 지워야 할지 알 길이 없다.
    image_keys = list(
        db.scalars(
            select(GuestbookEntry.image_key).where(
                GuestbookEntry.user_id == user.id,
                GuestbookEntry.image_key.is_not(None),
            )
        )
    )
    db.execute(delete(GuestbookEntry).where(GuestbookEntry.user_id == user.id))
    db.delete(user)
    db.commit()
    # 파일은 DB가 확정된 뒤에 지운다 (storage.delete_image_quietly 참고)
    for key in image_keys:
        delete_image_quietly(key)
