from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import game_score as crud
from app.db.session import get_db
from app.schemas.game_score import GameScoreOut

router = APIRouter(
    prefix="/admin/games",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/scores", response_model=list[GameScoreOut])
def list_scores_admin(db: Session = Depends(get_db)) -> list[GameScoreOut]:
    return crud.list_all(db)


@router.delete("/scores/{score_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_score(score_id: int, db: Session = Depends(get_db)) -> None:
    entry = crud.get_by_id(db, score_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="점수 기록을 찾을 수 없습니다.",
        )
    crud.delete(db, entry)
