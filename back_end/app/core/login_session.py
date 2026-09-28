"""한 계정은 한 곳에서만 로그인해 있게 한다. 나중에 로그인한 쪽이 이긴다.

Redis 같은 세션 저장소 없이 users 테이블의 칸 하나로 한다. 요청마다 토큰의 주인을
어차피 DB에서 꺼내오므로(`get_current_user`), 그 행에 "지금 유효한 로그인 번호"를
두고 토큰의 번호와 비교하면 추가 조회가 없다. 비밀번호 재설정 링크가 비밀번호
지문으로 일회용이 되는 것(`password_fingerprint`)과 같은 방식이다.

로그인 성공 경로(비밀번호 로그인·메일 인증·비밀번호 재설정·소셜 로그인)는 전부
토큰을 여기서 받는다. 한 곳이라도 `create_access_token`을 직접 부르면 그 경로로
로그인한 기기는 다른 기기를 쫓아내지 못한다.
"""

from sqlalchemy.orm import Session

from app.core.security import create_access_token, new_session_id
from app.models import User

SESSION_REPLACED_MESSAGE = "다른 곳에서 로그인해서 로그아웃됐어요. 다시 로그인해주세요."
# 401 응답에 붙여서, 프론트가 "그냥 만료"와 "다른 곳에서 로그인"을 구분하게 한다.
# 메시지 문구를 비교하게 하면 문구를 다듬는 순간 조용히 깨진다.
AUTH_REASON_HEADER = "X-Auth-Reason"
SESSION_REPLACED_REASON = "session_replaced"


def start_login_session(db: Session, user: User) -> str:
    """새 로그인 번호를 저장하고 그 번호가 든 토큰을 돌려준다.

    이 계정의 이전 토큰은 전부 이 순간부터 거절된다. 비밀번호 재설정도 이 함수를
    거치므로, 재설정하면 다른 기기의 로그인이 모두 끊긴다. 호출하는 쪽에서 바꿔둔
    값(새 비밀번호 등)도 여기서 함께 커밋된다.
    """
    user.session_id = new_session_id()
    db.commit()
    return create_access_token(str(user.id), user.session_id)
