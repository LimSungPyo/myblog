"""로그인하지 않은 방문자를 익명으로 구분하기.

원래 요청 제한 모듈(`ratelimit.py`)에 같이 있었는데, 조회수 중복 제거를 DB로 옮기면서
떼어냈다. 요청 제한은 "이 요청을 허용할까"를 묻고, 여기는 "같은 사람인가"를 묻는다.
질문이 달라서 한 파일에 있을 이유가 없어졌다.
"""

import hashlib
import hmac
from datetime import UTC, date, datetime

from fastapi import Request

from app.core.config import settings
from app.core.ratelimit import client_ip


def today_utc() -> date:
    """솔트와 방문 기록이 같이 쓰는 "오늘".

    둘이 따로 날짜를 구하면 자정 직전·직후에 식별자는 어제 솔트로, 기록은 오늘
    날짜로 남는 어긋남이 생긴다. 그래서 날짜는 이 함수 한 곳에서만 만든다.
    """
    return datetime.now(UTC).date()


def _daily_salt(day: date) -> str:
    """날마다 바뀌는 비밀 솔트.

    IP는 대부분의 법제에서 개인정보라 원문을 저장하지 않는 게 낫다. 그렇다고 그냥
    해시하면 IPv4는 43억 개뿐이라 전수 계산으로 역산된다. 그래서 서버만 아는 값을
    섞는다(여기서는 JWT 서명 키를 재사용한다).

    솔트를 날마다 갈아치우면 어제 만든 해시와 오늘 만든 해시가 이어지지 않는다.
    한 사람을 오래 추적하는 게 구조적으로 불가능해진다. 쿠키를 안 쓰는 분석 도구들이
    쓰는 방식이다. 대신 자정(UTC)을 넘기면 같은 사람이 다른 방문자로 보이므로,
    중복 제거 창은 "24시간"이 아니라 "그날 하루"다.
    """
    return f"{settings.JWT_SECRET}:{day.isoformat()}"


def visitor_id(request: Request, day: date) -> str:
    """로그인하지 않은 방문자를 구분하기 위한 익명 식별자.

    IP만으로는 같은 공유기 뒤의 사람들이 한 명으로 뭉쳐서, 한 명이 읽으면 나머지는
    조회수에 안 잡힌다. User-Agent를 같이 넣어 조금 더 갈라 놓는다. 완벽한 식별이
    아니라 근사치이고, 그래서 애초에 "정확한 조회수"가 아니라 "부풀리기 방지"가 목표다.
    """
    raw = f"{client_ip(request)}|{request.headers.get('user-agent', '')}"
    digest = hmac.new(_daily_salt(day).encode(), raw.encode(), hashlib.sha256)
    return digest.hexdigest()[:32]
