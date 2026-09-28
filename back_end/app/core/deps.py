import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.login_session import (
    AUTH_REASON_HEADER,
    SESSION_REPLACED_MESSAGE,
    SESSION_REPLACED_REASON,
)
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """유효한 JWT를 가진 아무 사용자(관리자/일반) 반환."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다."
        )
    token = decode_access_token(credentials.credentials)
    try:
        user_id = uuid.UUID(token.subject) if token else None
    except ValueError:
        user_id = None
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다."
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
        )
    # 다른 곳에서 로그인해 번호가 바뀌었으면 이 토큰은 끝났다.
    # 둘 다 비어 있는 경우만 예외로 통과한다: 로그인 번호가 생기기 전에 발급된 토큰이고,
    # 그 계정도 아직 새로 로그인한 적이 없는 경우다. 배포 순간에 전원을 튕기지 않으려는
    # 것이고, 그 계정이 한 번이라도 새로 로그인하면 번호 없는 옛 토큰은 여기서 막힌다.
    if token.session_id != user.session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=SESSION_REPLACED_MESSAGE,
            headers={AUTH_REASON_HEADER: SESSION_REPLACED_REASON},
        )
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """관리자만 통과. 일반 사용자는 403."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다."
        )
    return user
