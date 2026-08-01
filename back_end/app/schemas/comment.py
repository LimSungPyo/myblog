from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class CommentCreate(CamelModel):
    # 작성자 이름은 클라이언트가 보내지 않는다 — 서버가 로그인 사용자의 닉네임을 쓴다
    content: str = Field(min_length=1, max_length=2000)


class CommentOut(CamelModel):
    id: int
    post_id: int
    author_name: str
    content: str
    created_at: datetime


class CommentAdminOut(CamelModel):
    """관리자 목록용: 어느 글의 댓글인지 + 승인 여부 포함."""

    id: int
    post_id: int
    post_title: str
    post_slug: str
    author_name: str
    content: str
    approved: bool
    created_at: datetime


class CommentModerate(CamelModel):
    approved: bool
