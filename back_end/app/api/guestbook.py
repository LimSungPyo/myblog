from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.ratelimit import WRITE_BY_USER, guard, record
from app.crud import guestbook as crud
from app.db.session import get_db
from app.models import User
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
    payload: GuestbookCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GuestbookOut:
    # 계정 기준으로만 센다. 여기는 로그인해야 쓸 수 있어서 "누가 썼나"가 확실하다.
    key = f"write:guestbook:{user.id}"
    guard(key, WRITE_BY_USER)
    entry = crud.create(db, payload, author=user)
    # 실제로 글이 만들어졌을 때만 센다. 404나 검증 실패는 도배가 아니다.
    record(key, WRITE_BY_USER)
    return entry
