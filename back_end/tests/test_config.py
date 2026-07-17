import pytest

from app.core.config import Settings

_REQUIRED = {"JWT_SECRET": "x", "ADMIN_USERNAME": "a", "ADMIN_PASSWORD": "b"}


def test_normalizes_postgres_scheme():
    s = Settings(DATABASE_URL="postgres://u:p@h:5432/d", **_REQUIRED)
    assert s.DATABASE_URL.startswith("postgresql+psycopg2://")


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
