from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DB: PostgreSQL 전용. 기본값은 로컬 docker-compose Postgres(localhost, 비민감)라 그대로 둠.
    # 배포용 진짜 URL(Supabase 비번 포함)은 코드에 없고 대시보드에서만 주입.
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/myblog"

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        # 드라이버를 항상 psycopg2로 못박는다. 설치된 드라이버가 psycopg2뿐이라서다.
        # - postgres://   : Render/Heroku/Supabase가 주는 형식. SQLAlchemy 2.x는 이 이름을 모른다.
        # - postgresql:// : 드라이버를 안 적으면 SQLAlchemy가 기본값을 고르는데, 그 기본값이
        #   2.1부터 psycopg2 → psycopg(3)로 바뀌었다. requirements가 ">=2.0"이라 배포 때
        #   2.1이 설치되면서, 설치되지 않은 psycopg를 찾다가 서버가 기동 중에 죽었다.
        for bare in ("postgres://", "postgresql://"):
            if v.startswith(bare):
                v = "postgresql+psycopg2://" + v[len(bare) :]
                break
        if not v.startswith("postgresql"):
            raise ValueError(
                "이 프로젝트는 PostgreSQL 전용입니다. DATABASE_URL은 postgresql:// 형식이어야 합니다."
            )
        return v

    # JWT — 기본값 없음(필수). 값은 .env(로컬)/대시보드(배포)에서만 주입.
    # 미설정 시 서버가 아예 안 켜짐(fail-closed) → 약한 키로 배포되는 사고 방지.
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7일

    # 관리자 시드 계정 — 기본값 없음(필수). .env/대시보드에서만 주입.
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str

    # CORS: 프론트(Vercel) 오리진. 콤마로 여러 개 지정 가능.
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # 요청 제한이 클라이언트를 식별할 때 X-Forwarded-For를 오른쪽에서 몇 칸 볼지.
    # 프록시가 붙인 값만 믿기 위한 값이라 실제 홉 수와 정확히 같아야 한다
    # (크면 모두가 한 키를 공유해 다 같이 막히고, 작으면 헤더 위조가 통한다).
    # 로컬은 프록시가 없으니 0, Render 배포는 앞에 프록시 1대라 1.
    TRUSTED_PROXY_COUNT: int = 0

    # 메일(Brevo HTTP API) — 빈 값(기본)이면 메일이 필요한 기능(가입·비밀번호 재설정)이 503.
    # SMTP를 안 쓰는 이유: Render 무료 플랜이 아웃바운드 SMTP 포트를 차단한다(mailer.py 참고).
    # MAIL_FROM_EMAIL은 Brevo에 발신자로 등록·인증을 마친 주소여야 한다(미인증이면 발송 거절).
    BREVO_API_KEY: str = ""
    MAIL_FROM_EMAIL: str = ""
    MAIL_FROM_NAME: str = "myblog"

    # Google OAuth — 빈 값(기본)이면 소셜 로그인 라우트가 503을 반환.
    # 필수로 만들지 않은 이유: 미설정 환경(CI, 소셜 미사용 배포)에서도 서버는 떠야 함.
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # OAuth redirect_uri에 들어가는 백엔드 공개 주소 (배포 시 Render 도메인으로 교체)
    BACKEND_BASE_URL: str = "http://localhost:8000"

    # 이미지 저장소(Supabase Storage) — 셋 중 URL과 키가 비어 있으면(기본) 로컬 폴더에 저장한다.
    # 로컬 개발은 컨테이너나 가입 없이 바로 쓰고, 배포에서만 Supabase를 붙이기 위함이다.
    # SECRET_KEY는 sb_secret_로 시작하는 서버 전용 키. 저장소 파일을 지울 수도 있는 키라
    # 프론트(NEXT_PUBLIC_*)에는 절대 넣지 않는다.
    SUPABASE_URL: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "post-images"
    # 로컬 저장 폴더 (back_end 기준 상대 경로). .gitignore에 등록돼 있다.
    UPLOAD_DIR: str = ".uploads"
    # 배포에서는 false로 둔다. Supabase 설정을 깜빡하면 로컬 폴더로 떨어지는데, Render 무료
    # 인스턴스는 재배포·재시작마다 디스크가 비워져서 "올리기는 성공했는데 며칠 뒤 이미지가
    # 전부 사라지는" 일이 생긴다. 조용히 망가지느니 업로드를 503으로 막아 바로 드러나게 한다.
    ALLOW_LOCAL_UPLOADS: bool = True

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]


settings = Settings()
