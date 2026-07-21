from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import stats as crud
from app.db.session import get_db
from app.schemas.stats import AdminStats

router = APIRouter(
    prefix="/admin/stats",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db)):
    return crud.get_stats(db)
