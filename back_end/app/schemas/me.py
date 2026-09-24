from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.base import CamelModel


class MyCommentOut(CamelModel):
    id: int
    post_slug: str
    post_title: str
    content: str
    # 승인 전 댓글은 공개 목록에 안 보인다. 본인에게는 "승인 대기"로 보여줘야
    # 댓글이 사라졌다고 오해하지 않는다.
    approved: bool
    created_at: datetime


class MyGuestbookOut(CamelModel):
    id: int
    content: str
    created_at: datetime


class MyScoreOut(CamelModel):
    id: int
    game_key: str
    score: int
    created_at: datetime


class MyActivityOut(CamelModel):
    comments: list[MyCommentOut]
    guestbook: list[MyGuestbookOut]
    scores: list[MyScoreOut]


class DisplayNameUpdate(CamelModel):
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("display_name")
    @classmethod
    def strip_and_require(cls, v: str) -> str:
        # 공백만 넣은 이름은 글에 빈 칸으로 찍혀서 누가 썼는지 알 수 없게 된다
        v = v.strip()
        if not v:
            raise ValueError("닉네임을 입력해주세요.")
        return v
