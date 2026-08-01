from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GameScore, User
from app.schemas.game_score import GameScoreCreate


def list_top(db: Session, *, game_key: str, limit: int = 10) -> list[GameScore]:
    """게임별 상위 순위. 점수 내림차순, 동점이면 먼저 등록한 기록이 위."""
    return list(
        db.scalars(
            select(GameScore)
            .where(GameScore.game_key == game_key)
            .order_by(GameScore.score.desc(), GameScore.created_at.asc())
            .limit(limit)
        ).all()
    )


def list_all(db: Session) -> list[GameScore]:
    """관리자용: 전체 게임 순위. 게임별로 묶고 점수 내림차순."""
    return list(
        db.scalars(
            select(GameScore).order_by(
                GameScore.game_key.asc(),
                GameScore.score.desc(),
                GameScore.created_at.asc(),
            )
        ).all()
    )


def get_by_id(db: Session, score_id: int) -> GameScore | None:
    return db.get(GameScore, score_id)


def create(
    db: Session, *, game_key: str, data: GameScoreCreate, player: User
) -> GameScore:
    entry = GameScore(
        game_key=game_key,
        user_id=player.id,
        player_name=player.display_name,
        score=data.score,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete(db: Session, entry: GameScore) -> None:
    db.delete(entry)
    db.commit()
