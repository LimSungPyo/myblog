import pytest

from app.core.config import Settings

_REQUIRED = {"JWT_SECRET": "x", "ADMIN_USERNAME": "a", "ADMIN_PASSWORD": "b"}


def test_normalizes_postgres_scheme():
    s = Settings(DATABASE_URL="postgres://u:p@h:5432/d", **_REQUIRED)
    assert s.DATABASE_URL.startswith("postgresql+psycopg2://")


def test_bare_postgresql_scheme_pins_psycopg2_driver():
    """드라이버를 안 적은 postgresql:// 는 SQLAlchemy 버전마다 고르는 드라이버가 다르다.
    2.1부터는 psycopg(3)를 골라서, 설치되지 않은 드라이버를 찾다가 배포 서버가 죽었다."""
    s = Settings(DATABASE_URL="postgresql://u:p@h:5432/d", **_REQUIRED)
    assert s.DATABASE_URL == "postgresql+psycopg2://u:p@h:5432/d"


def test_engine_actually_uses_psycopg2():
    """문자열만 보지 않고, SQLAlchemy가 실제로 어떤 드라이버를 쓰는지까지 확인한다."""
    from sqlalchemy.engine import make_url

    for raw in ("postgres://u:p@h/d", "postgresql://u:p@h/d"):
        url = Settings(DATABASE_URL=raw, **_REQUIRED).DATABASE_URL
        assert make_url(url).get_dialect().driver == "psycopg2"


def test_explicit_driver_is_left_alone():
    s = Settings(DATABASE_URL="postgresql+psycopg2://u:p@h/d", **_REQUIRED)
    assert s.DATABASE_URL == "postgresql+psycopg2://u:p@h/d"


def test_rejects_non_postgres():
    with pytest.raises(Exception):
        Settings(DATABASE_URL="sqlite:///./x.db", **_REQUIRED)


def test_fail_closed_when_secrets_missing(monkeypatch):
    for k in ("JWT_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD"):
        monkeypatch.delenv(k, raising=False)
    # _env_file=None → .env 파일도 무시하고 순수 필수값 검증
    with pytest.raises(Exception):
        Settings(_env_file=None)


def test_cors_origins_split():
    s = Settings(
        FRONTEND_ORIGIN="http://a.com, http://b.com",
        DATABASE_URL="postgresql://u:p@h/d",
        **_REQUIRED,
    )
    assert s.cors_origins == ["http://a.com", "http://b.com"]
