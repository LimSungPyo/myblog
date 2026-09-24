from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PostView(Base):
    """조회수 중복 제거용 방문 기록. (글, 방문자, 날짜)마다 한 줄.

    예전에는 "이미 센 방문자"를 프로세스 메모리에 기억했는데, 배포나 Render 슬립으로
    프로세스가 새로 뜰 때마다 기억이 날아가 같은 독자가 다시 세어졌다. 공격이 아니라
    평소 운영만으로 조회수가 부풀던 것이라 DB로 옮겼다.

    세 컬럼을 묶어 기본 키로 둔 이유: 이 조합이 곧 "이미 셌다"의 정의라서, DB가
    중복을 막아주면 검사와 기록을 INSERT 한 번으로 끝낼 수 있다.
    """

    __tablename__ = "post_views"

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    # 날마다 바뀌는 솔트로 만든 익명 해시 (app/core/visitor.py). IP 원문은 남기지 않는다
    visitor: Mapped[str] = mapped_column(String(32), primary_key=True)
    # 오래된 기록을 지울 때 이 컬럼으로 찾으므로 인덱스를 따로 둔다
    day: Mapped[date] = mapped_column(Date, primary_key=True, index=True)
