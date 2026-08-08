"""헬스체크 두 경로의 역할 분리 검증.

- /health     : Render의 healthCheckPath. 프로세스만 본다(DB 무관).
- /health/db  : Supabase 일시정지 방지용 keep-alive. DB까지 왕복한다.
"""

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_db
from app.main import app


class _BrokenSession:
    """DB 연결이 끊긴 상황. execute하면 SQLAlchemyError를 던진다."""

    def execute(self, *args, **kwargs):
        raise SQLAlchemyError("connection refused")


@pytest.fixture
def broken_db(client):
    """client 픽스처가 깔아둔 get_db override를 끊긴 세션으로 덮어쓴다."""

    def _override():
        yield _BrokenSession()

    app.dependency_overrides[get_db] = _override
    return client


# ─────────────── /health ───────────────
def test_health_returns_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_health_stays_ok_when_db_is_down(broken_db):
    """DB가 죽어도 200이어야 한다. 아니면 Render가 서비스를 재시작시킨다."""
    res = broken_db.get("/health")
    assert res.status_code == 200


# ─────────────── /health/db ───────────────
def test_health_db_returns_ok(client):
    res = client.get("/health/db")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "ok"}


def test_health_db_returns_503_when_db_is_down(broken_db):
    """크론이 실패를 감지할 수 있도록 5xx여야 한다(200이면 정지를 놓친다)."""
    res = broken_db.get("/health/db")
    assert res.status_code == 503


# ─────────────── HEAD ───────────────
# 외부 크론(cron-job.org)은 응답 본문을 4KB까지만 받고 넘으면 연결을 끊는다.
# 잠든 무료 인스턴스를 깨우는 동안 Render가 흘려보내는 HTML이 그 한도를 넘겨
# 연결이 끊기면, 기동 요청까지 취소돼 서버가 영영 깨어나지 않는다.
# 본문을 받지 않는 HEAD로 보내면 이 한도와 무관해진다.
def test_health_allows_head(client):
    res = client.head("/health")
    assert res.status_code == 200


def test_health_db_allows_head(client):
    res = client.head("/health/db")
    assert res.status_code == 200


def test_health_db_head_still_touches_db(broken_db):
    """HEAD로 바꿔도 SELECT 1은 그대로 돌아야 Supabase 무활동 방지가 유지된다."""
    res = broken_db.head("/health/db")
    assert res.status_code == 503
