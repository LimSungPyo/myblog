import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class GameScore(Base):
    """미니게임 순위 기록. game_key로 게임을 구분해 한 테이블로 여러 게임을 담는다."""

    __tablename__ = "game_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_key: Mapped[str] = mapped_column(String(40), index=True)
    # 탈퇴해도 기록은 남기고, player_name은 등록 시점 닉네임 스냅샷
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    # display_name(최대 80자) 스냅샷이 들어가므로 길이를 맞춘다
    player_name: Mapped[str] = mapped_column(String(80))
    score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
