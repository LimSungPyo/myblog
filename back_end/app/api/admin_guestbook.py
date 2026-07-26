from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import guestbook as crud
from app.db.session import get_db
from app.schemas.guestbook import GuestbookOut

router = APIRouter(
    prefix="/admin/guestbook",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=list[GuestbookOut])
def list_guestbook_admin(db: Session = Depends(get_db)) -> list[GuestbookOut]:
    return crud.list_all(db)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guestbook(entry_id: int, db: Session = Depends(get_db)) -> None:
    entry = crud.get_by_id(db, entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="방명록을 찾을 수 없습니다.",
        )
    crud.delete(db, entry)
