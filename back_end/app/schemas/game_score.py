from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class GameScoreCreate(CamelModel):
    player_name: str = Field(min_length=1, max_length=40)
    # 비정상적으로 큰 값 방지용 상한 (2048의 현실적 점수 범위를 크게 상회)
    score: int = Field(ge=0, le=10_000_000)


class GameScoreOut(CamelModel):
    id: int
    game_key: str
    player_name: str
    score: int
    created_at: datetime
