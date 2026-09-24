from datetime import date, timedelta

from sqlalchemy import delete, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Post, PostView

# 오늘과 어제만 남긴다. 방문자 식별값은 날마다 바뀌는 솔트로 만들어서, 이틀 전 기록은
# 오늘 방문을 판단하는 데 쓸 수가 없다. 쓸모없는 익명 흔적을 쌓아둘 이유가 없다.
# 어제까지 남기는 건 자정(UTC) 직전에 들어온 요청이 늦게 처리될 때를 위한 여유다.
RETENTION_DAYS = 2


def record_first_view(db: Session, post: Post, visitor: str, day: date) -> bool:
    """오늘 처음 온 방문자면 기록하고 조회수를 1 올린다. 셌으면 True.

    `ON CONFLICT DO NOTHING`이라 이미 있는 (글, 방문자, 날짜)면 아무 일도 안 일어나고
    RETURNING이 비어서 온다. 검사와 기록이 한 문장이라, 같은 사람이 탭 두 개를 동시에
    열어도 둘 중 하나만 들어간다.
    """
    inserted = (
        db.execute(
            insert(PostView)
            .values(post_id=post.id, visitor=visitor, day=day)
            .on_conflict_do_nothing()
            .returning(PostView.post_id)
        ).first()
        is not None
    )
    if inserted:
        # 파이썬에서 `post.view_count += 1`로 읽고-더하고-쓰면, 서로 다른 두 방문자가
        # 동시에 들어올 때 하나가 사라진다. 더하기를 DB에 맡겨서 한 문장으로 끝낸다.
        db.execute(
            update(Post)
            .where(Post.id == post.id)
            .values(view_count=Post.view_count + 1)
        )
    db.commit()
    if inserted:
        db.refresh(post)
    return inserted


def purge_older_than_retention(db: Session, today: date) -> int:
    """보관 기간이 지난 방문 기록을 지운다. 지운 줄 수를 돌려준다."""
    cutoff = today - timedelta(days=RETENTION_DAYS - 1)
    result = db.execute(delete(PostView).where(PostView.day < cutoff))
    db.commit()
    return result.rowcount


_last_purged_on: date | None = None


def purge_once_a_day(db: Session, today: date) -> None:
    """조회 요청이 들어올 때 하루 한 번만 청소한다.

    이 서버에는 스케줄러가 없다. 청소용 크론을 따로 두면 또 하나의 관리 대상이 되는데,
    조회 요청은 어차피 매일 들어오니 그 김에 한다. 서버가 재시작되면 그날 한 번 더
    돌 수 있지만, 지울 게 없으면 아무 일도 안 하는 DELETE라 해가 없다.
    """
    global _last_purged_on
    if _last_purged_on == today:
        return
    purge_older_than_retention(db, today)
    _last_purged_on = today
