from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class CommentCreate(CamelModel):
    author_name: str = Field(min_length=1, max_length=80)
    content: str = Field(min_length=1, max_length=2000)


class CommentOut(CamelModel):
    id: int
    post_id: int
    author_name: str
    content: str
    created_at: datetime
