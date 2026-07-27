from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class GameScore(Base):
    """미니게임 순위 기록. game_key로 게임을 구분해 한 테이블로 여러 게임을 담는다."""

    __tablename__ = "game_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_key: Mapped[str] = mapped_column(String(40), index=True)
    player_name: Mapped[str] = mapped_column(String(40))
    score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
