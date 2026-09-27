from datetime import datetime

from pydantic import Field, computed_field

from app.core.storage import public_image_url
from app.schemas.base import CamelModel


class GuestbookOut(CamelModel):
    id: int
    author_name: str
    content: str
    created_at: datetime
    # 저장 경로는 응답에 싣지 않고, 화면에 필요한 주소만 계산해서 내보낸다
    image_key: str | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def image_url(self) -> str | None:
        return public_image_url(self.image_key)


class PaginatedGuestbook(CamelModel):
    items: list[GuestbookOut]
    total: int
    page: int
    page_size: int
    total_pages: int
