import uuid

from pydantic import Field

from app.schemas.base import CamelModel


class SignupRequest(CamelModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=4, max_length=128)


class LoginRequest(CamelModel):
    username: str
    password: str


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = False


class UserOut(CamelModel):
    id: uuid.UUID
    username: str
    is_admin: bool
