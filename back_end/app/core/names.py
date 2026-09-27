"""글에 찍히는 작성자 이름을 정하는 규칙.

댓글·방명록은 쓸 당시의 이름을 복사해서 저장한다(스냅샷). 그 이름을 무엇으로 할지를
여기 한 곳에서 정한다. 이름을 넣는 곳(작성, 닉네임 변경)이 각자 규칙을 가지면 한쪽만
바뀌어서 어긋나기 쉽다.
"""

from app.models import User

# 관리자가 쓴 댓글·방명록에 찍히는 이름. 방문자 입장에서는 관리자의 닉네임보다
# "블로그 주인이 답했다"는 사실이 중요하다.
ADMIN_AUTHOR_NAME = "관리자"


def author_name_for(user: User) -> str:
    """댓글·방명록에 찍을 작성자 이름. 게임 기록에는 쓰지 않는다(닉네임 그대로)."""
    return ADMIN_AUTHOR_NAME if user.is_admin else user.display_name
