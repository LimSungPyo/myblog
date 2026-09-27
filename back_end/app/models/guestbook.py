import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class GuestbookEntry(Base):
    __tablename__ = "guestbook"

    id: Mapped[int] = mapped_column(primary_key=True)
    # author_name은 작성 시점 닉네임 스냅샷. 탈퇴하면 방명록은 함께 지운다(crud/me.py
    # withdraw). ON DELETE SET NULL은 그 삭제를 거치지 않고 계정이 지워질 때의 안전망이다.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    author_name: Mapped[str] = mapped_column(String(80))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
