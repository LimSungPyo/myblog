from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import GuestbookEntry, User
from app.schemas.guestbook import GuestbookCreate


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


def create(db: Session, data: GuestbookCreate, author: User) -> GuestbookEntry:
    entry = GuestbookEntry(
        user_id=author.id, author_name=author.display_name, content=data.content
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete(db: Session, entry: GuestbookEntry) -> None:
    db.delete(entry)
    db.commit()
