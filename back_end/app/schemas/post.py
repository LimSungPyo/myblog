from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel
from app.schemas.taxonomy import CategoryOut, TagOut


class PostOut(CamelModel):
    id: int
    slug: str
    title: str
    excerpt: str
    content: str
    cover_image: str | None = None
    category: CategoryOut | None = None
    tags: list[TagOut] = []
    status: str
    view_count: int
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class PostListItem(CamelModel):
    """목록용 경량 스키마 (본문 content 제외)."""

    id: int
    slug: str
    title: str
    excerpt: str
    cover_image: str | None = None
    category: CategoryOut | None = None
    tags: list[TagOut] = []
    status: str
    view_count: int
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class PostCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200)
    excerpt: str = ""
    content: str = ""
    cover_image: str | None = None
    category_id: int | None = None
    tag_ids: list[int] = []
    status: Literal["draft", "published"] = "draft"


class PostUpdate(PostCreate):
    pass
