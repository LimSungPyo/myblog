"""show admin as 관리자 on existing comments and guestbook

Revision ID: 447b9c88149c
Revises: 1db8d979d862
Create Date: 2026-09-28 01:48:59.514437

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '447b9c88149c'
down_revision: str | None = '1db8d979d862'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# 관리자가 쓴 댓글·방명록의 작성자 이름(스냅샷)을 "관리자"로 맞춘다.
# 새로 쓰는 글은 코드(app/core/names.py)가 "관리자"로 저장하고, 이건 그 전에 쓴 글을 위한 것이다.
# 게임 기록(player_name)은 닉네임을 그대로 쓰므로 건드리지 않는다.
ADMIN_AUTHOR_NAME = "관리자"


def upgrade() -> None:
    for table in ("comments", "guestbook"):
        op.execute(
            sa.text(
                f"UPDATE {table} SET author_name = :name "
                f"FROM users WHERE users.id = {table}.user_id AND users.is_admin"
            ).bindparams(name=ADMIN_AUTHOR_NAME)
        )


def downgrade() -> None:
    # 원래 닉네임은 어디에도 남아 있지 않아 되돌릴 수 없다. 관리자의 현재 닉네임으로
    # 돌려놓는 게 가장 가까운 복구다.
    for table in ("comments", "guestbook"):
        op.execute(
            f"UPDATE {table} SET author_name = users.display_name "
            f"FROM users WHERE users.id = {table}.user_id AND users.is_admin"
        )
