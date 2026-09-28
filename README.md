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
[Vercel] Next.js  ──API──▶  [Render] FastAPI  ──▶  [PostgreSQL] Supabase
  · 공개 페이지 SSR(SEO)        · REST API                · 글/태그/카테고리/댓글
  · 통합 로그인/회원가입         · JWT 인증 + 역할(관리자/일반)   · 방명록/게임점수/방문 기록
  · 관리자 마크다운 에디터       · Google OAuth              · 사용자/소셜계정
  · 마이페이지                   · 요청 제한 · 이미지 처리
                                   │
                                   ├──▶ [Supabase Storage] 글·방명록 이미지
                                   └──▶ [Brevo] 인증·비밀번호 재설정 메일
```

## 기능

- **화면 디자인: 제도판 테마** — 로고인 제도용 컴퍼스에 맞춰 사이트 전체를 도면처럼 구성
  - 라이트 "제도지"(푸른 기가 도는 흰 바탕) · 다크 "청사진", 제목은 굵은 고딕(Pretendard), 날짜·번호 같은 주석은 고정폭 글꼴
  - **홈 첫 화면 컴퍼스**: 마우스(휴대폰은 손가락 드래그)를 따라 연필 다리가 돌며 원을 그림, 한 바퀴를 다 그리면 인사
  - **지난 1년의 걸음**: 한 칸이 한 주인 눈금자, 글을 쓴 주를 누르면 그 주의 글로 이동
  - **어디로 갈까요?**: 메뉴를 가리키면 바늘이 그쪽으로 도는 메뉴 다이얼 (휴대폰은 목록)
  - 글마다 발행 순서 번호(N°), 본문 소제목에 §번호
  - 기기의 "동작 줄이기" 설정을 켜면 움직임 없이 결과만 보여줌
- 글 목록/상세, 페이지네이션, 조회수
  - **읽기 진행 표시**: 본문을 읽은 만큼 작은 컴퍼스가 원을 그림 (넓은 화면 왼쪽 칸, 휴대폰은 오른쪽 아래)
  - **글 목차**: 넓은 화면은 본문 왼쪽에 따라다니고 휴대폰은 본문 위에 접힘, 지금 읽는 절과 지나온 절 표시 (`##`·`###` 제목, 2개 이상일 때)
  - **이전·다음 기록**, 가장 넓은 화면에서는 오른쪽 "도면 정보" 칸(분류·작성일·조회·분량·태그)
  - **코드 복사 버튼**: 코드 블록 오른쪽 위 버튼으로 원문 복사
  - 같은 방문자가 같은 글을 하루에 여러 번 열어도 1회만 집계 (IP 원문 대신 날마다 바뀌는 솔트로 해시, 방문 기록 2일 보관)
- 태그 · 카테고리 분류/필터
- 검색
- 댓글 (로그인 필요, 바로 공개 · 관리자가 숨기거나 삭제 가능)
- 방명록 (로그인 필요)
  - **사진 첨부**: 글과 함께 또는 사진만, 계정당 하루 5장
- **미니게임**: 2048 — 점수 등록 및 순위표
- 소개 페이지
- **작성자 이름**: 댓글·방명록은 작성 당시 닉네임으로 표시, 관리자가 쓴 글은 "관리자"로 표시
  - 일반 회원은 "관리자·운영자·운영진"이 들어간 닉네임이나 `admin`을 쓸 수 없음 (사칭 방지)
- **인증**: 회원가입(`/signup`) · 통합 로그인(`/login`) · **Google 소셜 로그인**
  - **이메일 인증**: 가입 시 인증 메일 발송(Brevo HTTP API), 메일 링크를 열어야 로그인 완료
  - **비밀번호 찾기/재설정**(`/forgot-password`): 메일 링크로 새 비밀번호 설정 (링크는 30분 유효·일회용)
  - 회원은 **이메일**, 관리자는 아이디로 로그인 (같은 입력칸)
  - 로그인 성공 시 **관리자 → 관리자 페이지**, 일반 회원 → 홈으로 자동 이동
  - 헤더 계정 버튼: 비로그인 → 로그인, 회원 → 마이페이지, 관리자 → 관리자 페이지
  - 사용자 PK는 **UUID**, 비밀번호는 bcrypt 해시 저장 (소셜 전용 계정은 비밀번호 없음)
  - 소셜 로그인은 검증된 이메일 기준으로 기존 계정에 자동 연결(중복 계정 방지, 미인증 계정의 비밀번호는 연결 시 폐기)
  - **한 계정 한 곳 로그인**: 다른 곳에서 로그인하면 이전 기기는 로그아웃되고, 그 탭으로 돌아오는 순간 알림창으로 이유를 안내 (비밀번호 재설정 시에도 다른 기기 모두 로그아웃)
- **마이페이지** (`/mypage`, 로그인 필요)
  - 내 댓글(관리자가 숨긴 댓글 표시 포함)·방명록·게임 기록 모아보기, 내 댓글·방명록 삭제
  - 닉네임 변경 (예전 댓글·방명록·게임 기록의 이름도 함께 변경)
  - 로그아웃, **회원 탈퇴** ("탈퇴합니다" 입력으로 확인)
    - 방명록은 삭제, 댓글·게임 기록은 "탈퇴한 사용자"로 남김 · 관리자 계정은 탈퇴 불가
- **관리자** (`/admin/*`, 관리자만 접근)
  - 마크다운 글쓰기(작성/수정/삭제), 댓글 숨김/삭제, 방명록 관리(사진 확인·삭제), 미니게임 순위 관리, 통계 대시보드
  - **이미지 업로드**: 에디터에 붙여넣기·끌어다 놓기·버튼, 커버 이미지 업로드
- **이미지 처리**: 올린 이미지는 서버가 검사 후 다시 저장
  - JPG·PNG·WebP만(10MB 이하), 사진 속 위치정보(EXIF) 제거, 회전 반영, WebP 변환
  - 가로 1600px(글) / 1000px(방명록)으로 축소, 방명록을 지우면(본인·관리자·탈퇴) 사진 파일도 삭제
- **요청 제한**: 로그인 실패(계정·IP), 메일 발송(수신 주소·IP), 댓글·방명록 작성(계정)
  - 초과 시 `429` + `Retry-After`, 화면에 남은 대기 시간 표시
- SEO: SSR, `generateMetadata`(OG), sitemap/robots

## 기술 스택

| 영역   | 스택                                                                |
| ------ | ------------------------------------------------------------------- |
| 프론트 | Next.js 16(App Router), TypeScript, Tailwind, react-markdown, Pretendard·Gowun Batang·Geist 글꼴 |
| 백엔드 | FastAPI, SQLAlchemy 2.0, Alembic, PyJWT, bcrypt, httpx(OAuth·메일·저장소), Pillow(이미지) |
| DB     | PostgreSQL (로컬 Docker / 배포 Supabase)                            |
| 파일   | Supabase Storage (로컬은 `back_end/.uploads` 폴더)                   |
| 메일   | Brevo HTTP API                                                      |
| 테스트 | pytest, vitest + Testing Library, Playwright(E2E)                   |
| CI     | GitHub Actions                                                      |

## 로컬 개발

### 백엔드 (PostgreSQL 전용)

```bash
cd back_end
docker-compose up -d              # 로컬 Postgres 기동 (localhost:5432)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt   # 앱 + 테스트·린트 도구
cp .env.example .env              # JWT_SECRET / ADMIN_* 를 실제 값으로 채움(필수)
                                  # GOOGLE_* 는 선택 — 비우면 소셜 로그인만 비활성
                                  # BREVO_* 는 선택 — 비우면 가입·비밀번호 재설정만 비활성
                                  # SUPABASE_* 는 비워둠 — 이미지는 back_end/.uploads 에 저장
alembic upgrade head              # 스키마 생성 (Alembic이 단일 소스)
python -m app.seed                # 관리자 + 샘플 데이터
uvicorn app.main:app --reload     # http://localhost:8000/docs
```

> `JWT_SECRET`·`ADMIN_*`는 기본값이 없어 미설정 시 서버가 뜨지 않습니다(fail-closed).
>
> 로컬 `.env`에 `SUPABASE_*`를 넣으면 로컬에서 올린 이미지가 운영 저장소로 올라가고,
> 백엔드 테스트도 운영 저장소에 파일을 올리게 됩니다. 로컬에서는 비워두세요.

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
| 백엔드 | Render          | `back_end`     | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, `FRONTEND_ORIGIN`, `BACKEND_BASE_URL`, `GOOGLE_*`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`, `ALLOW_LOCAL_UPLOADS=false`, `TRUSTED_PROXY_COUNT=1` |
| DB     | Supabase        | —              | 관리형 PostgreSQL                                                  |
| 파일   | Supabase Storage | —             | 공개(Public) 버킷 `post-images`, 업로드 정책 없음(서버 비밀 키로만 업로드) |

- `main` 브랜치에 push → Vercel/Render 자동 빌드·배포 (CI/CD)
- 배포 후 최초 1회: `alembic upgrade head` + `python -m app.seed`
- 스키마 변경이 포함된 배포는 백엔드 배포 **전에** 원격 DB에 `alembic upgrade head` 먼저 적용
- Google 소셜 로그인은 Google Cloud Console에서 OAuth 클라이언트를 만들고 리디렉션 URI에 `<백엔드 주소>/auth/google/callback` 등록 후 `GOOGLE_*` 입력
- 메일: Brevo에 발신자 주소 인증, **Authorized IPs에 Render의 Outbound IP 범위 등록** (미등록 시 발송이 401로 막힘)
- 이미지: `SUPABASE_SECRET_KEY`는 `sb_secret_...` 비밀 키. 백엔드에만 두고 프론트(`NEXT_PUBLIC_*`)에는 넣지 않음
  - `ALLOW_LOCAL_UPLOADS=false`: 저장소 설정이 빠지면 업로드를 막음 (Render 디스크는 재배포 때 비워져 이미지가 사라지므로)
- `TRUSTED_PROXY_COUNT`: 요청 제한이 클라이언트 IP를 구분할 때 믿을 프록시 수. 실제 홉 수와 같아야 함 (Render는 1)
- 환경변수 실제 값은 각 대시보드에 입력(코드·저장소엔 없음). 붙여넣은 키가 **한 줄인지** 확인
