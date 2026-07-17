# myblog

개인 블로그 — **Next.js**(프론트) + **FastAPI**(백엔드) 모노레포.

## 구조

```
myblog/
├─ front_end/   # Next.js (App Router) + TypeScript  → Vercel 배포
└─ back_end/    # FastAPI + PostgreSQL               → Render/Fly 배포
```

## 아키텍처

```
[Vercel] Next.js  ──API──▶  [Render/Fly] FastAPI  ──▶  [PostgreSQL] Supabase/Neon
  · 공개 페이지 SSR(SEO)        · REST API                · 글/태그/카테고리/댓글
  · 통합 로그인/회원가입         · JWT 인증 + 역할(관리자/일반)
  · 관리자 마크다운 에디터
```

## 기능

- 글 목록/상세, 페이지네이션
- 태그 · 카테고리 분류/필터
- 검색
- 댓글
- **인증**: 회원가입(`/signup`) · 통합 로그인(`/login`)
  - 로그인 성공 시 **관리자 → 관리자 페이지**, 일반 회원 → 홈으로 자동 이동
  - 사용자 PK는 **UUID**, 비밀번호는 bcrypt 해시 저장
- **관리자**: 로그인 후 마크다운 글쓰기(작성/수정/삭제) — `/admin/*`는 관리자만 접근
- SEO: SSR, `generateMetadata`(OG), sitemap/robots

## 기술 스택

| 영역 | 스택 |
|------|------|
| 프론트 | Next.js 16(App Router), TypeScript, Tailwind, react-markdown |
| 백엔드 | FastAPI, SQLAlchemy 2.0, Alembic, python-jose(JWT), passlib(bcrypt) |
| DB | PostgreSQL (로컬 Docker / 배포 Supabase·Neon) |
| 테스트 | pytest, vitest + Testing Library, Playwright(E2E) |
| CI | GitHub Actions |

## 로컬 개발

### 백엔드 (PostgreSQL 전용)
```bash
cd back_end
docker-compose up -d              # 로컬 Postgres 기동 (localhost:5432)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # JWT_SECRET / ADMIN_* 를 실제 값으로 채움(필수)
alembic upgrade head              # 스키마 생성 (Alembic이 단일 소스)
python -m app.seed                # 관리자 + 샘플 데이터
uvicorn app.main:app --reload     # http://localhost:8000/docs
```
> `JWT_SECRET`·`ADMIN_*`는 기본값이 없어 미설정 시 서버가 뜨지 않습니다(fail-closed).

### 프론트엔드
```bash
cd front_end
npm install
cp .env.example .env.local         # API 주소 설정 (백엔드 미연결 시 목 데이터로 동작)
npm run dev                        # http://localhost:3000
```

## 테스트

```bash
# 백엔드 (테스트 DB는 트랜잭션 롤백으로 격리)
cd back_end && ./.venv/bin/pytest --cov=app
# 프론트 단위/컴포넌트
cd front_end && npm run test
# E2E (스택 기동 필요)
cd front_end && npm run test:e2e
```
`push`·PR 시 GitHub Actions(`.github/workflows/ci.yml`)가 백엔드·프론트·E2E를 자동 실행합니다.

## 배포

| 대상 | 서비스 | Root Directory | 주요 환경변수 |
|------|--------|----------------|----------------|
| 프론트 | Vercel | `front_end` | `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` |
| 백엔드 | Render/Fly | `back_end` | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, `FRONTEND_ORIGIN` |
| DB | Supabase / Neon | — | 관리형 PostgreSQL |

- `main` 브랜치에 push → Vercel/Render 자동 빌드·배포 (CI/CD)
- 배포 후 최초 1회: `alembic upgrade head` + `python -m app.seed`
- 환경변수 실제 값은 각 대시보드에 입력(코드·저장소엔 없음)
