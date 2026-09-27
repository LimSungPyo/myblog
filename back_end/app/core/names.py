"""글에 찍히는 작성자 이름을 정하는 규칙.

댓글·방명록은 쓸 당시의 이름을 복사해서 저장한다(스냅샷). 그 이름을 무엇으로 할지를
여기 한 곳에서 정한다. 이름을 넣는 곳(작성, 닉네임 변경)이 각자 규칙을 가지면 한쪽만
바뀌어서 어긋나기 쉽다.
"""

import re

from app.models import User

# 관리자가 쓴 댓글·방명록에 찍히는 이름. 방문자 입장에서는 관리자의 닉네임보다
# "블로그 주인이 답했다"는 사실이 중요하다.
ADMIN_AUTHOR_NAME = "관리자"


def author_name_for(user: User) -> str:
    """댓글·방명록에 찍을 작성자 이름. 게임 기록에는 쓰지 않는다(닉네임 그대로)."""
    return ADMIN_AUTHOR_NAME if user.is_admin else user.display_name


# ── 관리자 사칭 방지 ─────────────────────────────────────────────────────
# 관리자 글이 "관리자"로 보이게 된 뒤로는, 일반 회원이 닉네임을 "관리자"로 지으면
# 방문자가 진짜 관리자와 구분할 수 없다. 그래서 그런 닉네임을 막는다.
#
# 한글은 "들어가면" 막는다("블로그관리자", "관리자입니다"도 오해를 부른다).
# 영어는 "같을 때만" 막는다. 들어가면 막기로 하면 "badminton" 같은 평범한 이름까지 걸린다.
_RESERVED_KOREAN = ("관리자", "운영자", "운영진")
_RESERVED_ENGLISH = {"admin", "administrator"}


def is_reserved_name(name: str) -> bool:
    """관리자로 오해받을 수 있는 이름인가.

    띄어쓰기·대소문자·숫자·기호만 바꿔 쓰는 우회("관 리 자", "ADMIN!!", "admin1")도
    잡으려고, 글자(한글·영문)만 남기고 소문자로 바꾼 뒤 비교한다.
    """
    letters = re.sub(r"[^a-z가-힣]", "", name.lower())
    return letters in _RESERVED_ENGLISH or any(w in letters for w in _RESERVED_KOREAN)


RESERVED_NAME_MESSAGE = "'관리자'처럼 운영자로 오해받을 수 있는 닉네임은 쓸 수 없어요."
