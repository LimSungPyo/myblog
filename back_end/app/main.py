from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api import (
    admin_comments,
    admin_games,
    admin_guestbook,
    admin_posts,
    admin_stats,
    auth,
    games,
    guestbook,
    oauth,
    posts,
    taxonomy,
)
from app.core.config import settings
from app.db.session import get_db

app = FastAPI(title="myblog API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(posts.router)
app.include_router(taxonomy.router)
app.include_router(guestbook.router)
app.include_router(games.router)
app.include_router(admin_posts.router)
app.include_router(admin_comments.router)
app.include_router(admin_stats.router)
app.include_router(admin_guestbook.router)
app.include_router(admin_games.router)


@app.api_route("/health", methods=["GET", "HEAD"], tags=["meta"])
def health() -> dict[str, str]:
    """프로세스만 확인하는 헬스체크. Render의 healthCheckPath가 이 경로를 본다.

    DB를 건드리지 않는 이유: DB가 잠깐 흔들렸다고 Render가 서비스를
    비정상으로 보고 재시작시키면 안 되기 때문.

    HEAD를 함께 여는 이유: 외부 크론이 본문 없이 상태 코드만 받게 하기 위해서다.
    cron-job.org는 응답 본문을 4KB까지만 받고 넘으면 연결을 끊는데, 잠든 무료
    인스턴스를 깨우는 동안 Render가 흘려보내는 HTML이 그 한도를 넘긴다. 연결이
    끊기면 기동 요청까지 취소돼 서버가 영영 깨어나지 않는다.
    """
    return {"status": "ok"}


@app.api_route("/health/db", methods=["GET", "HEAD"], tags=["meta"])
def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """DB까지 왕복하는 헬스체크.

    Supabase 무료 플랜은 7일간 활동이 적으면 프로젝트를 일시정지하고,
    복구는 대시보드에서 수동으로 해야 한다. 이를 막기 위해 외부 크론이
    하루 1회 이 경로를 호출한다. Render 헬스체크와 분리돼 있으므로
    여기서 503이 나도 서비스가 재시작되지는 않는다.

    HEAD를 함께 여는 이유는 /health와 같다. 본문을 안 보내도 SELECT 1은
    그대로 실행되므로 무활동 방지 목적에는 영향이 없다.
    """
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return {"status": "ok", "database": "ok"}
