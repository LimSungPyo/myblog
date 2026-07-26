from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.crud import guestbook as crud
from app.db.session import get_db
from app.schemas.guestbook import (
    GuestbookCreate,
    GuestbookOut,
    PaginatedGuestbook,
)

router = APIRouter(prefix="/guestbook", tags=["guestbook"])


@router.get("", response_model=PaginatedGuestbook)
def list_guestbook(
    page: int = Query(1, ge=1),
    page_size: int = Query(4, ge=1, le=50, alias="pageSize"),
    db: Session = Depends(get_db),
) -> PaginatedGuestbook:
    items, total = crud.list_entries(db, page=page, page_size=page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedGuestbook(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=GuestbookOut, status_code=status.HTTP_201_CREATED)
def create_guestbook(
    payload: GuestbookCreate, db: Session = Depends(get_db)
) -> GuestbookOut:
    return crud.create(db, payload)
