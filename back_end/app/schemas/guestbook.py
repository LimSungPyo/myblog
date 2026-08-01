from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class GuestbookCreate(CamelModel):
    # 작성자 이름은 클라이언트가 보내지 않는다 — 서버가 로그인 사용자의 닉네임을 쓴다
    content: str = Field(min_length=1, max_length=1000)


class GuestbookOut(CamelModel):
    id: int
    author_name: str
    content: str
    created_at: datetime


class PaginatedGuestbook(CamelModel):
    items: list[GuestbookOut]
    total: int
    page: int
    page_size: int
    total_pages: int
