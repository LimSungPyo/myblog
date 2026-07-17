"""초기 데이터 시드 스크립트 (관리자 계정 + 샘플 카테고리/태그/글).

스키마는 Alembic이 관리한다. 실행 전 반드시 마이그레이션을 먼저 적용할 것:

    alembic upgrade head
    python -m app.seed
"""

from datetime import UTC, datetime

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Category, Post, Tag, User


def seed() -> None:
    db = SessionLocal()
    try:
        # --- 관리자 ---
        if (
            db.scalar(select(User).where(User.username == settings.ADMIN_USERNAME))
            is None
        ):
            db.add(
                User(
                    username=settings.ADMIN_USERNAME,
                    hashed_password=hash_password(settings.ADMIN_PASSWORD),
                    is_admin=True,
                )
            )
            print(f"[seed] admin 계정 생성: {settings.ADMIN_USERNAME}")

        # 이미 글이 있으면 샘플 데이터는 건너뜀
        if db.scalar(select(Post)) is not None:
            db.commit()
            print("[seed] 기존 글이 있어 샘플 데이터는 건너뜁니다.")
            return

        # --- 카테고리 ---
        cats = {
            "dev": Category(name="개발", slug="dev"),
            "retro": Category(name="회고", slug="retro"),
            "life": Category(name="일상", slug="life"),
        }
        db.add_all(cats.values())

        # --- 태그 ---
        tags = {
            "nextjs": Tag(name="Next.js", slug="nextjs"),
            "fastapi": Tag(name="FastAPI", slug="fastapi"),
            "typescript": Tag(name="TypeScript", slug="typescript"),
            "seo": Tag(name="SEO", slug="seo"),
        }
        db.add_all(tags.values())
        db.flush()

        now = datetime.now(UTC)
        posts = [
            Post(
                slug="why-nextjs-for-blog",
                title="블로그에 Next.js를 쓰는 이유",
                excerpt="SPA/CSR/SSR 차이를 정리하고, 왜 블로그에는 SSR이 유리한지 살펴봅니다.",
                content=(
                    "## 왜 Next.js인가\n\n"
                    "블로그처럼 **검색 노출(SEO)** 이 중요한 서비스에서는 "
                    "서버 사이드 렌더링(SSR)이 큰 무기가 됩니다.\n\n"
                    "- **CSR**: 초기 HTML이 비어 있어 크롤러에 불리\n"
                    "- **SSR**: 서버가 완성된 HTML을 내려줌\n\n"
                    "```ts\nexport default async function Page() {\n"
                    "  const posts = await getPosts();\n"
                    "  return <PostList posts={posts} />;\n}\n```\n"
                ),
                status="published",
                published_at=now,
                category=cats["dev"],
                tags=[tags["nextjs"], tags["typescript"], tags["seo"]],
                view_count=128,
            ),
            Post(
                slug="attach-fastapi-backend",
                title="FastAPI로 백엔드 붙이기",
                excerpt="Next.js 프론트에 FastAPI + PostgreSQL 백엔드를 연결한 과정.",
                content=(
                    "## FastAPI로 API 서버 붙이기\n\n"
                    "프론트는 Vercel, 백엔드는 Render에 올리고 REST로 연결했습니다.\n\n"
                    "1. `GET /posts` — 목록 + 페이지네이션\n"
                    "2. `GET /posts/{slug}` — 상세\n"
                    "3. `POST /auth/login` — 관리자 JWT 발급\n"
                ),
                status="published",
                published_at=now,
                category=cats["dev"],
                tags=[tags["fastapi"]],
                view_count=74,
            ),
            Post(
                slug="draft-example",
                title="(임시저장) 작성 중인 글",
                excerpt="아직 발행되지 않은 초안입니다.",
                content="작성 중…",
                status="draft",
                category=cats["retro"],
                tags=[],
                view_count=0,
            ),
        ]
        db.add_all(posts)
        db.commit()
        print(f"[seed] 샘플 글 {len(posts)}개 생성 완료")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
