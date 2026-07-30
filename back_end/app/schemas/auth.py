import uuid

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import CamelModel


class LoginRequest(CamelModel):
    # 관리자는 username, 일반 회원은 이메일을 넣는다 (필드명은 하위 호환 유지)
    username: str
    password: str


class SignupRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("password")
    @classmethod
    def password_within_bcrypt_limit(cls, v: str) -> str:
        # bcrypt는 72바이트까지만 해시에 반영한다 (4.1+는 초과 시 예외)
        if len(v.encode("utf-8")) > 72:
            raise ValueError("비밀번호는 최대 72바이트까지 가능합니다.")
        return v


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = False


class UserOut(CamelModel):
    id: uuid.UUID
    username: str | None
    email: str | None
    display_name: str
    avatar_url: str | None
    is_admin: bool
