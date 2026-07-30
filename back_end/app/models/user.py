import uuid

from sqlalchemy import Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    # 순차 정수 대신 추측 불가능한 UUID를 PK로 사용
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # username은 관리자 전용 로그인 식별자 (일반 회원은 email 사용)
    username: Mapped[str | None] = mapped_column(String(80), unique=True, index=True)
    # 소셜 로그인 전용 계정은 비밀번호가 없음
    hashed_password: Mapped[str | None] = mapped_column(String(255))
    # 항상 소문자로 정규화해 저장 (대소문자만 다른 중복 계정 방지)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_name: Mapped[str] = mapped_column(String(80))
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
