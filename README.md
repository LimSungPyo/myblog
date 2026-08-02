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
[Vercel] Next.js  ──API──▶  [Render/Fly] FastAPI  ──▶  [PostgreSQL] Supabase
  · 공개 페이지 SSR(SEO)        · REST API                · 글/태그/카테고리/댓글
  · 통합 로그인/회원가입         · JWT 인증 + 역할(관리자/일반)   · 방명록/게임점수
  · 관리자 마크다운 에디터       · Google OAuth              · 사용자/소셜계정
```

## 기능

- 글 목록/상세, 페이지네이션, 조회수
- 태그 · 카테고리 분류/필터
- 검색
- 댓글 (관리자 승인제)
- 방명록
- **미니게임**: 2048 — 점수 등록 및 순위표
- 소개 페이지
- **인증**: 회원가입(`/signup`) · 통합 로그인(`/login`) · **Google 소셜 로그인**
  - **이메일 인증**: 가입 시 인증 메일 발송(Gmail SMTP), 메일 링크를 열어야 로그인 완료
  - **비밀번호 찾기/재설정**(`/forgot-password`): 메일 링크로 새 비밀번호 설정 (링크는 30분 유효·일회용)
  - 로그인 성공 시 **관리자 → 관리자 페이지**, 일반 회원 → 홈으로 자동 이동
  - 헤더에서 로그인 상태 표시(로그인/로그아웃 버튼 토글)
  - 사용자 PK는 **UUID**, 비밀번호는 bcrypt 해시 저장 (소셜 전용 계정은 비밀번호 없음)
  - 소셜 로그인은 검증된 이메일 기준으로 기존 계정에 자동 연결(중복 계정 방지, 미인증 계정의 비밀번호는 연결 시 폐기)
- **관리자** (`/admin/*`, 관리자만 접근)
  - 마크다운 글쓰기(작성/수정/삭제), 댓글 승인/삭제, 방명록 관리, 미니게임 순위 관리, 통계 대시보드
- SEO: SSR, `generateMetadata`(OG), sitemap/robots

## 기술 스택

| 영역   | 스택                                                                |
| ------ | ------------------------------------------------------------------- |
| 프론트 | Next.js 16(App Router), TypeScript, Tailwind, react-markdown        |
| 백엔드 | FastAPI, SQLAlchemy 2.0, Alembic, PyJWT, bcrypt, httpx(OAuth)      |
| DB     | PostgreSQL (로컬 Docker / 배포 Supabase·Neon)                       |
| 테스트 | pytest, vitest + Testing Library, Playwright(E2E)                   |
| CI     | GitHub Actions                                                      |

## 로컬 개발

### 백엔드 (PostgreSQL 전용)

```bash
cd back_end
docker-compose up -d              # 로컬 Postgres 기동 (localhost:5432)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # JWT_SECRET / ADMIN_* 를 실제 값으로 채움(필수)
                                  # GOOGLE_* 는 선택 — 비우면 소셜 로그인만 비활성
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

| 대상   | 서비스          | Root Directory | 주요 환경변수                                                      |
| ------ | --------------- | -------------- | ------------------------------------------------------------------ |
| 프론트 | Vercel          | `front_end`    | `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` |
| 백엔드 | Render/Fly      | `back_end`     | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, `FRONTEND_ORIGIN`, `BACKEND_BASE_URL`, `GOOGLE_*` |
| DB     | Supabase / Neon | —              | 관리형 PostgreSQL                                                  |

- `main` 브랜치에 push → Vercel/Render 자동 빌드·배포 (CI/CD)
- 배포 후 최초 1회: `alembic upgrade head` + `python -m app.seed`
- 스키마 변경이 포함된 배포는 백엔드 배포 **전에** 원격 DB에 `alembic upgrade head` 먼저 적용
- Google 소셜 로그인은 Google Cloud Console에서 OAuth 클라이언트를 만들고 리디렉션 URI에 `<백엔드 주소>/auth/google/callback` 등록 후 `GOOGLE_*` 입력
- 환경변수 실제 값은 각 대시보드에 입력(코드·저장소엔 없음)
