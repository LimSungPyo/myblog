import uuid

from app.schemas.base import CamelModel


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
