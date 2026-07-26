from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class GuestbookCreate(CamelModel):
    author_name: str = Field(min_length=1, max_length=80)
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
