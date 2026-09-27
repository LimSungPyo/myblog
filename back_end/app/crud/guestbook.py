from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.names import author_name_for
from app.core.storage import delete_image_quietly
from app.models import GuestbookEntry, User


def list_entries(
    db: Session, *, page: int = 1, page_size: int = 5
) -> tuple[list[GuestbookEntry], int]:
    """최신순 페이지네이션."""
    total = db.scalar(select(func.count()).select_from(GuestbookEntry)) or 0
    items = db.scalars(
        select(GuestbookEntry)
        .order_by(GuestbookEntry.created_at.desc(), GuestbookEntry.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(items), total


def list_all(db: Session) -> list[GuestbookEntry]:
    """관리자용: 전체 방명록, 최신순."""
    return list(
        db.scalars(
            select(GuestbookEntry).order_by(
                GuestbookEntry.created_at.desc(), GuestbookEntry.id.desc()
            )
        ).all()
    )


def get_by_id(db: Session, entry_id: int) -> GuestbookEntry | None:
    return db.get(GuestbookEntry, entry_id)


def create(
    db: Session, *, content: str, author: User, image_key: str | None = None
) -> GuestbookEntry:
    entry = GuestbookEntry(
        user_id=author.id,
        author_name=author_name_for(author),
        content=content,
        image_key=image_key,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete(db: Session, entry: GuestbookEntry) -> None:
    """글과 붙어 있던 사진 파일을 함께 지운다.

    글만 지우고 파일을 남기면, 주소를 아는 사람은 계속 그 사진을 볼 수 있다.
    부적절한 사진을 내렸는데 링크로는 살아 있는 게 가장 곤란한 상황이다.
    """
    image_key = entry.image_key
    db.delete(entry)
    db.commit()
    delete_image_quietly(image_key)
