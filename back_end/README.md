# myblog · back_end (FastAPI)

Next.js 프론트와 연결되는 REST API 서버. **PostgreSQL 전용** + JWT 인증.

## 로컬 실행

```bash
# 1) 로컬 Postgres 기동 (Docker)
docker-compose up -d          # localhost:5432, DB=myblog (user/pw: postgres/postgres)

# 2) 파이썬 환경
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # JWT_SECRET / ADMIN_* 를 실제 값으로 채워야 함(필수)

# 3) 스키마 + 초기 데이터
alembic upgrade head          # 테이블 생성 (스키마는 Alembic이 관리)
python -m app.seed            # 관리자 계정 + 샘플 글

# 4) 서버
uvicorn app.main:app --reload # http://localhost:8000/docs
```

관리자 계정은 `.env`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 값으로 생성됩니다.
`JWT_SECRET`·`ADMIN_*`는 **기본값이 없어 미설정 시 서버가 켜지지 않습니다**(fail-closed). 생성: `openssl rand -hex 32`.

> Docker가 없으면 Postgres.app 등 로컬 Postgres를 띄우고 `.env`의 `DATABASE_URL`만 맞추면 됩니다.

## 마이그레이션 (Alembic)

스키마 변경은 전적으로 Alembic로 관리한다(단일 소스). 모델 수정 후:

```bash
alembic revision --autogenerate -m "메시지"   # 새 마이그레이션 생성
alembic upgrade head                          # 적용
```

## 주요 엔드포인트

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/auth/signup` | 회원가입(일반 회원) → JWT | - |
| POST | `/auth/login` | 로그인 → JWT + `isAdmin` | - |
| GET | `/auth/me` | 현재 로그인 사용자 | Bearer |
| GET | `/posts` | 목록 (page, pageSize, category, tag, q) | - |
| GET | `/posts/{slug}` | 상세 (조회수 증가 안 함) | - |
| POST | `/posts/{slug}/view` | 조회수 +1 (실제 방문 카운트) | - |
| GET | `/posts/slugs` | 발행글 slug 목록(sitemap) | - |
| GET | `/posts/{slug}/comments` | 댓글 목록 | - |
| POST | `/posts/{slug}/comments` | 댓글 작성 | - |
| GET | `/categories`, `/tags` | 분류 목록 | - |
| GET | `/admin/posts` | 전체 글(초안 포함) | Bearer(관리자) |
| POST/PUT/DELETE | `/admin/posts[/{id}]` | 글 생성/수정/삭제 | Bearer(관리자) |

- 사용자 모델: `id`(UUID) · `username` · `hashed_password`(bcrypt) · `is_admin`
- 관리자 계정은 **시드로만** 생성(회원가입은 일반 회원). `/admin/*`는 `is_admin` 검증(아니면 403).
- 응답은 프론트 친화적으로 **camelCase**로 직렬화된다.

## 테스트

```bash
pip install -r requirements-dev.txt
pytest --cov=app          # 테스트 DB는 트랜잭션 롤백으로 격리
```

## 배포 (Render 예시)

- Root Directory: `back_end`, Dockerfile 사용
- 환경변수: `DATABASE_URL`(Postgres), `JWT_SECRET`, `ADMIN_USERNAME/PASSWORD`, `FRONTEND_ORIGIN`(Vercel 도메인)
- 배포 후 최초 1회 마이그레이션: `alembic upgrade head` (+ 필요 시 관리자 시드)
