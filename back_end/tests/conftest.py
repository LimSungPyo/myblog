"""pytest 공용 픽스처.

- 테스트 DB: 별도 데이터베이스 `myblog_test` (개발/운영 DB와 격리)
- 격리: 테스트마다 트랜잭션을 열고 끝나면 롤백(savepoint 방식) → 데이터 잔존 없음
- config가 fail-closed이므로, 앱 import 전에 필수 env를 주입한다.
"""

import os

# ── 앱 import 전에 테스트용 env 주입 (env 변수는 .env 파일보다 우선) ──
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/myblog_test",
)
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-only")
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "admin1234")
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:3000")

import psycopg2  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.session import Base, engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category, Post, Tag, User  # noqa: E402


def _ensure_test_database() -> None:
    """테스트 DB가 없으면 생성 (maintenance DB인 postgres에 접속)."""
    url = make_url(settings.DATABASE_URL)
    conn = psycopg2.connect(
        host=url.host,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        dbname="postgres",
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (url.database,))
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{url.database}"')
    conn.close()


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    _ensure_test_database()
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """테스트마다 트랜잭션 열고 끝나면 롤백. 앱 코드의 commit()은 savepoint로 흡수."""
    connection = engine.connect()
    trans = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─────────────── 사용자 픽스처 ───────────────
@pytest.fixture
def admin_user(db_session) -> User:
    user = User(
        username="admin",
        hashed_password=hash_password("admin1234"),
        is_admin=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def regular_user(db_session) -> User:
    user = User(
        username="testuser",
        hashed_password=hash_password("test1234"),
        is_admin=False,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin_headers(admin_user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(admin_user.username)}"}


@pytest.fixture
def user_headers(regular_user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(regular_user.username)}"}


# ─────────────── 데이터 팩토리 ───────────────
@pytest.fixture
def category(db_session) -> Category:
    c = Category(name="개발", slug="dev")
    db_session.add(c)
    db_session.commit()
    return c


@pytest.fixture
def tag(db_session) -> Tag:
    t = Tag(name="Next.js", slug="nextjs")
    db_session.add(t)
    db_session.commit()
    return t


@pytest.fixture
def make_post(db_session):
    def _make(
        slug: str = "post",
        title: str = "제목",
        status: str = "published",
        content: str = "본문",
        excerpt: str = "",
        category: Category | None = None,
        tags: list[Tag] | None = None,
    ) -> Post:
        post = Post(
            slug=slug,
            title=title,
            excerpt=excerpt,
            content=content,
            status=status,
            category=category,
            tags=tags or [],
        )
        post.mark_published()
        db_session.add(post)
        db_session.commit()
        return post

    return _make
