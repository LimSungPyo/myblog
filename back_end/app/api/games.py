from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import game_score as crud
from app.db.session import get_db
from app.models import User
from app.schemas.game_score import GameScoreCreate, GameScoreOut

router = APIRouter(prefix="/games", tags=["games"])

# 순위를 기록할 수 있는 게임 목록. 새 미니게임을 추가할 때 여기에 키를 등록한다.
GAME_KEYS = {"2048"}


def _require_known_game(game_key: str) -> str:
    if game_key not in GAME_KEYS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "알 수 없는 게임입니다.")
    return game_key


@router.get("/{game_key}/scores", response_model=list[GameScoreOut])
def list_scores(
    game_key: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[GameScoreOut]:
    _require_known_game(game_key)
    return crud.list_top(db, game_key=game_key, limit=limit)


@router.post(
    "/{game_key}/scores",
    response_model=GameScoreOut,
    status_code=status.HTTP_201_CREATED,
)
def create_score(
    game_key: str,
    payload: GameScoreCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GameScoreOut:
    _require_known_game(game_key)
    return crud.create(db, game_key=game_key, data=payload, player=user)
